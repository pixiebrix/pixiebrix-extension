/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { v4 as uuidv4 } from "uuid";
import {
  getChromeExtensionId,
  isExtensionContext,
  RuntimeNotFoundError,
} from "@/chrome";
import { browser, Runtime } from "webextension-polyfill-ts";
// @ts-ignore: types not defined for match-pattern
import matchPattern from "match-pattern";
import {
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

const handlers: { [key: string]: HandlerEntry } = {};

/**
 * Return true if a message sender is either the extension itself, or an externally connectable page
 * https://developer.chrome.com/extensions/security#sanitize
 */
function allowBackgroundSender(
  sender: ChromeMessageSender | Runtime.MessageSender
): boolean {
  const { externally_connectable } = chrome.runtime.getManifest();
  return (
    sender.id === browser.runtime.id ||
    ("origin" in sender &&
      externally_connectable.matches?.some((x) =>
        matchPattern.parse(x).test(sender.origin)
      ))
  );
}

function backgroundListener(
  request: RemoteProcedureCallRequest,
  sender: Runtime.MessageSender
): Promise<unknown> | undefined {
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage

  if (!allowBackgroundSender(sender)) {
    console.debug(
      `Ignoring message to background page from unknown sender`,
      sender
    );
    return;
  }

  const { type, payload, meta } = request;
  const { handler, options } = handlers[type] ?? {};

  if (handler) {
    const notification = isNotification(options);

    // console.debug(
    //   `Handling background ${
    //     notification ? "notification" : "action"
    //   } ${type} (nonce: ${meta?.nonce})`
    // );

    const handlerPromise = new Promise((resolve) =>
      resolve(handler(...payload))
    );

    if (notification) {
      handlerPromise.catch((reason) => {
        console.warn(
          `An error occurred when handling notification ${type} (nonce: ${meta?.nonce})`,
          reason
        );
      });
      return;
    }

    return handlerPromise.then(
      (value) => {
        console.debug(
          `Handler FULFILLED action ${type} (nonce: ${meta?.nonce})`
        );
        return value;
      },
      (reason) => {
        console.debug(
          `Handler REJECTED action ${type} (nonce: ${meta?.nonce})`
        );
        return toErrorResponse(type, reason);
      }
    );
  }
}

export function getExtensionId(): string {
  if (isContentScript() || isOptionsPage() || isBackgroundPage()) {
    return browser.runtime.id;
  } else {
    if (chrome.runtime == null) {
      throw new RuntimeNotFoundError(
        "Browser runtime is unavailable; is the extension externally connectable?"
      );
    }
    return getChromeExtensionId();
  }
}

function externalSendMessage(
  extensionId: string | undefined,
  message: unknown,
  options?: Runtime.SendMessageOptionsType
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(extensionId, message, options, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export async function callBackground(
  type: string,
  args: unknown[],
  options: HandlerOptions
): Promise<unknown> {
  const nonce = uuidv4();
  const message = { type, payload: args, meta: { nonce } };

  // When accessing from an external site via chrome, browser.runtime won't be available.
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#Communicating_with_background_scripts
  const sendMessage = isExtensionContext()
    ? browser.runtime.sendMessage
    : externalSendMessage;
  const extensionId = isExtensionContext() ? null : getExtensionId();

  if (isNotification(options)) {
    console.debug(`Sending background notification ${type} (nonce: ${nonce})`, {
      extensionId,
    });
    sendMessage(extensionId, message, {}).catch((reason) => {
      console.warn(
        `An error occurred processing background notification ${type} (nonce: ${nonce})`,
        reason
      );
    });
    return;
  } else {
    console.debug(`Sending background action ${type} (nonce: ${nonce})`, {
      extensionId,
    });
    let response;
    try {
      response = await sendMessage(extensionId, message, {});
    } catch (err) {
      console.debug(
        `Error sending background action ${type} (nonce: ${nonce})`,
        { extensionId, err }
      );
      throw err;
    }

    // console.debug(
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
  method: () => R,
  options?: HandlerOptions
): () => Promise<R>;
export function liftBackground<T, R extends SerializableResponse>(
  type: string,
  method: (a0: T) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T) => Promise<R>;
export function liftBackground<T0, T1, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1) => R,
  options?: HandlerOptions
): (a0: T0, a1: T1) => Promise<R>;
export function liftBackground<T0, T1, T2, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2) => R,
  options?: HandlerOptions
): (a0: T0, a1: T1, a2: T2) => Promise<R>;
export function liftBackground<T0, T1, T2, T3, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2, a3: T3) => R,
  options?: HandlerOptions
): (a0: T0, a1: T1, a2: T2, a3: T3) => Promise<R>;
export function liftBackground<R extends SerializableResponse>(
  type: string,
  method: (...args: unknown[]) => R,
  options?: HandlerOptions
): (...args: unknown[]) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isBackgroundPage()) {
    if (handlers[fullType]) {
      console.warn(`Handler already registered for ${fullType}`);
    } else {
      // console.debug(`Installed background page handler for ${type}`);
      handlers[fullType] = { handler: method, options };
    }
  }

  return async (...args: unknown[]) => {
    if (isBackgroundPage()) {
      console.log(`Resolving ${type} immediately from background page`);
      return new Promise((resolve) => resolve(method(...args)));
    }
    return (await callBackground(fullType, args, options)) as any;
  };
}

if (isBackgroundPage()) {
  browser.runtime.onMessage.addListener(backgroundListener);
  browser.runtime.onMessageExternal.addListener(backgroundListener);
}
