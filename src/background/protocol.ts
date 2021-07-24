/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { v4 as uuidv4 } from "uuid";
import { getChromeExtensionId, RuntimeNotFoundError } from "@/chrome";
import { browser, Runtime } from "webextension-polyfill-ts";
import { patternToRegex } from "webext-patterns";
import chromeP from "webext-polyfill-kinda";
import {
  isExtensionContext,
  isBackgroundPage,
  isContentScript,
  isOptionsPage,
} from "webext-detect-page";
import { deserializeError } from "serialize-error";

import {
  HandlerEntry,
  SerializableResponse,
  HandlerOptions,
  isNotification,
  toErrorResponse,
  isErrorResponse,
  RemoteProcedureCallRequest,
} from "@/messaging/protocol";
type ChromeMessageSender = chrome.runtime.MessageSender;

export const MESSAGE_PREFIX = "@@pixiebrix/background/";

const handlers: Map<string, HandlerEntry> = new Map();

/**
 * Return true if a message sender is either the extension itself, or an externally connectable page
 * https://developer.chrome.com/extensions/security#sanitize
 */
export function allowBackgroundSender(
  sender: ChromeMessageSender | Runtime.MessageSender
): boolean {
  if (sender == null) {
    return false;
  }

  const { externally_connectable } = chrome.runtime.getManifest();
  return (
    sender.id === browser.runtime.id ||
    ("origin" in sender &&
      patternToRegex(...externally_connectable.matches).test(sender.origin))
  );
}

async function handleRequest(
  request: RemoteProcedureCallRequest,
  sender: Runtime.MessageSender
): Promise<unknown> {
  const { type, payload, meta } = request;
  const { handler, options } = handlers.get(type);

  try {
    const value = await handler(...payload);

    console.debug(
      `Handler FULFILLED action ${type} (nonce: ${meta?.nonce}, tab: ${sender.tab?.id}, frame: ${sender.frameId})`
    );
    return value;
  } catch (error: unknown) {
    if (isNotification(options)) {
      console.warn(
        `An error occurred when handling notification ${type} (nonce: ${meta?.nonce}, tab: ${sender.tab?.id}, frame: ${sender.frameId})`,
        error
      );
      return;
    }

    console.debug(
      `Handler REJECTED action ${type} (nonce: ${meta?.nonce}, tab: ${sender.tab?.id}, frame: ${sender.frameId})`
    );

    return toErrorResponse(type, error);
  }
}

export function getExtensionId(): string {
  if (isContentScript() || isOptionsPage() || isBackgroundPage()) {
    return browser.runtime.id;
  }

  if (chrome.runtime == null) {
    throw new RuntimeNotFoundError(
      "Browser runtime is unavailable; is the extension externally connectable?"
    );
  }

  return getChromeExtensionId();
}

export async function callBackground(
  type: string,
  args: unknown[],
  options: HandlerOptions
): Promise<unknown> {
  const nonce = uuidv4();
  const message = { type, payload: args, meta: { nonce } };

  console.log("isExtensionContext()", isExtensionContext());
  // `browser.*` APIs are not polyfilled outside the extension context (`externally_connectable` pages)
  // https://github.com/mozilla/webextension-polyfill/issues/326
  const sendMessage = isExtensionContext()
    ? browser.runtime.sendMessage
    : chromeP.runtime.sendMessage;
  const extensionId = isExtensionContext() ? null : getExtensionId();

  if (isNotification(options)) {
    console.debug(`Sending background notification ${type} (nonce: ${nonce})`, {
      extensionId,
    });
    sendMessage(extensionId, message, {}).catch((error: unknown) => {
      console.warn(
        `An error occurred processing background notification ${type} (nonce: ${nonce})`,
        error
      );
    });
  } else {
    console.debug(`Sending background action ${type} (nonce: ${nonce})`, {
      extensionId,
    });
    let response;
    try {
      response = await sendMessage(extensionId, message, {});
    } catch (error: unknown) {
      console.debug(
        `Error sending background action ${type} (nonce: ${nonce})`,
        { extensionId, error }
      );
      throw error;
    }

    // Console.debug(
    //   `Content script received response for ${type} (nonce: ${nonce})`,
    //   response
    // );

    if (isErrorResponse(response)) {
      throw deserializeError(response.$$error);
    }

    return response;
  }
}

/**
 * Lift a method to be run on the background page
 * @param type a unique name for the background action
 * @param method the method to lift
 * @param options background action handler options
 */
export function liftBackground<R extends SerializableResponse>(
  type: string,
  method: () => R | Promise<R>,
  options?: HandlerOptions
): () => Promise<R>;
export function liftBackground<T, R extends SerializableResponse>(
  type: string,
  method: (a0: T) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T) => Promise<R>;
export function liftBackground<T0, T1, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T0, a1: T1) => Promise<R>;
export function liftBackground<T0, T1, T2, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T0, a1: T1, a2: T2) => Promise<R>;
export function liftBackground<T0, T1, T2, T3, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2, a3: T3) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T0, a1: T1, a2: T2, a3: T3) => Promise<R>;
export function liftBackground<R extends SerializableResponse>(
  type: string,
  method: (...args: unknown[]) => R | Promise<R>,
  options?: HandlerOptions
): (...args: unknown[]) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isBackgroundPage()) {
    if (handlers.has(fullType)) {
      console.warn(`Handler already registered for ${fullType}`);
    } else {
      handlers.set(fullType, { handler: method, options });
    }
  }

  return async (...args: unknown[]) => {
    if (isBackgroundPage()) {
      console.trace(`Resolving ${type} immediately from background page`);
      return method(...args);
    }

    return callBackground(fullType, args, options) as R;
  };
}

function backgroundListener(
  request: RemoteProcedureCallRequest,
  sender: Runtime.MessageSender
): Promise<unknown> | void {
  console.log("got request", request);
  // Returning "undefined" indicates the message has not been handled
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage

  if (!allowBackgroundSender(sender)) {
    return;
  }

  if (handlers.has(request.type)) {
    return handleRequest(request, sender);
  }
}

if (isBackgroundPage()) {
  browser.runtime.onMessage.addListener(backgroundListener);
  browser.runtime.onMessageExternal.addListener(backgroundListener);
}
