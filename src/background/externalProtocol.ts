/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { uuidv4 } from "@/types/helpers";
import { getChromeExtensionId, RuntimeNotFoundError } from "@/chrome";
import { Runtime } from "webextension-polyfill";
import { patternToRegex } from "webext-patterns";
import chromeP from "webext-polyfill-kinda";
import { isBackground, isExtensionContext } from "webext-detect-page";
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
  } catch (error) {
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

async function callBackground(
  type: string,
  args: unknown[],
  options: HandlerOptions
): Promise<unknown> {
  if (!isExtensionContext() && chrome.runtime == null) {
    throw new RuntimeNotFoundError(
      "Browser runtime is unavailable; is the extension externally connectable?"
    );
  }

  const nonce = uuidv4();
  const message = { type, payload: args, meta: { nonce } };

  // `browser.*` APIs are not polyfilled outside the extension context (`externally_connectable` pages)
  // https://github.com/mozilla/webextension-polyfill/issues/326
  // Explicit type currently needed due to a "mismatch" in type
  const sendMessage: typeof browser.runtime.sendMessage = isExtensionContext()
    ? browser.runtime.sendMessage
    : chromeP.runtime.sendMessage;
  const extensionId = isExtensionContext() ? null : getChromeExtensionId();

  if (isNotification(options)) {
    console.debug(`Sending background notification ${type} (nonce: ${nonce})`, {
      extensionId,
    });
    // eslint-disable-next-line promise/prefer-await-to-then -- Legacy code
    sendMessage(extensionId, message, {}).catch((error) => {
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
    } catch (error) {
      console.debug(
        `Error sending background action ${type} (nonce: ${nonce})`,
        { extensionId, error }
      );
      throw error;
    }

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
 * @deprecated Only use via `liftExternal`. Use `webext-messenger` for in-extension communication
 */
export function _liftBackground<
  TArguments extends unknown[],
  R extends SerializableResponse
>(
  type: string,
  method: (...args: TArguments) => Promise<R>,
  options?: HandlerOptions
): (...args: TArguments) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isBackground()) {
    if (handlers.has(fullType)) {
      console.warn(`Handler already registered for ${fullType}`);
    } else {
      handlers.set(fullType, { handler: method, options });
    }

    return method;
  }

  return async (...args: TArguments) =>
    callBackground(fullType, args, options) as R;
}

function backgroundListener(
  request: RemoteProcedureCallRequest,
  sender: Runtime.MessageSender
): Promise<unknown> | void {
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

if (isBackground()) {
  browser.runtime.onMessage.addListener(backgroundListener);
  browser.runtime.onMessageExternal.addListener(backgroundListener);
}
