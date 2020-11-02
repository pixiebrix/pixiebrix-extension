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
import { getChromeExtensionId, RuntimeNotFoundError } from "@/chrome";
// @ts-ignore: types not defined for match-pattern
import matchPattern from "match-pattern";
import {
  isBackgroundPage,
  isContentScript,
  isOptionsPage,
} from "webext-detect-page";
import { deserializeError } from "serialize-error";
import { isEmpty, partial } from "lodash";

import {
  HandlerEntry,
  SerializableResponse,
  HandlerOptions,
  toErrorResponse,
  isErrorResponse,
  RemoteProcedureCallRequest,
} from "@/messaging/protocol";
type MessageOptions = chrome.runtime.MessageOptions;
type MessageSender = chrome.runtime.MessageSender;

const MESSAGE_PREFIX = "@@pixiebrix/background/";

export class BackgroundActionError extends Error {
  errors: unknown;
  cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "BackgroundActionError";
    this.cause = cause;
  }
}

const handlers: { [key: string]: HandlerEntry } = {};

/**
 * Return true if a message sender is either the extension itself, or an externally connectable page
 * https://developer.chrome.com/extensions/security#sanitize
 */
function allowBackgroundSender(sender: MessageSender): boolean {
  const { externally_connectable } = chrome.runtime.getManifest();
  return (
    sender.id === chrome.runtime.id ||
    externally_connectable.matches.some((x) =>
      matchPattern.parse(x).test(sender.origin)
    )
  );
}

function isNotification(
  options: HandlerOptions = { asyncResponse: true }
): boolean {
  return !(options?.asyncResponse ?? true);
}

function handleRequest(
  request: RemoteProcedureCallRequest,
  sender: MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  if (!allowBackgroundSender(sender)) {
    console.debug(
      `Ignoring message to background page from unknown sender`,
      sender
    );
    // not handled, so don't need to keep sendResponse handle
    return false;
  }

  const { handler, options } = handlers[request.type] ?? {};
  const notification = isNotification(options);

  if (handler) {
    console.debug(
      `Handling background ${notification ? "notification" : "action"} ${
        request.type
      } (nonce: ${request.meta?.nonce})`,
      { sender, sendResponse }
    );

    new Promise((resolve) => resolve(handler(...request.payload)))
      .then((response) => {
        if (!notification) {
          sendResponse(response);
          console.debug(
            `Handler replied with success response for action ${request.type} (nonce: ${request.meta?.nonce})`
          );
        }
      })
      .catch((reason) => {
        if (!notification) {
          sendResponse(toErrorResponse(request.type, reason));
          console.debug(
            `Handler replied with error response for action ${request.type} (nonce: ${request.meta?.nonce})`
          );
        } else {
          console.warn(
            `An error occurred while handling notification ${request.type}`,
            reason
          );
        }
      });

    return !notification;
  } else if (request.type.startsWith(MESSAGE_PREFIX)) {
    console.warn(`No handler installed for message ${request.type}`);
  }

  // not handled, so don't need to keep sendResponse handle
  return false;
}

type SendMessage = (
  request: RemoteProcedureCallRequest,
  options: MessageOptions,
  callback?: (response: unknown) => void
) => void;

function getExternalSendMessage(): SendMessage {
  const extensionId = getChromeExtensionId();
  if (chrome.runtime == null) {
    throw new RuntimeNotFoundError(
      "Chrome runtime is unavailable; is the extension externally connectable?"
    );
  } else if (isEmpty(extensionId)) {
    throw new Error("Could not find chrome extension id");
  }
  // there's another signature that includes MessageOptions, so have to cast here
  return partial(chrome.runtime.sendMessage, extensionId) as SendMessage;
}

export function getSendMessage(): SendMessage {
  if (isContentScript() || isOptionsPage()) {
    return partial(chrome.runtime.sendMessage, null);
  } else {
    return getExternalSendMessage();
  }
}

// exported for the webapp
export function callBackground(
  type: string,
  args: unknown[],
  options: HandlerOptions
): Promise<unknown> {
  const sendMessage = getSendMessage();
  const message = { type, payload: args, meta: { nonce: uuidv4() } };

  if (isNotification(options)) {
    console.debug(`Sending background notification ${type}`, message);
    try {
      sendMessage(message, {});
      return Promise.resolve();
    } catch (reason) {
      return Promise.reject(reason);
    }
  } else {
    return new Promise((resolve, reject) => {
      console.debug(`Sending background action ${type}`, message);
      sendMessage(message, {}, function (response: unknown) {
        console.debug(
          `Content script received response for ${type} (nonce: ${message.meta.nonce})`,
          response
        );
        if (chrome.runtime.lastError != null) {
          reject(
            new BackgroundActionError(
              `Error processing background message ${type} (nonce: ${message.meta.nonce}): ${chrome.runtime.lastError.message}`,
              chrome.runtime.lastError
            )
          );
        } else if (isErrorResponse(response)) {
          reject(deserializeError(response.$$error));
        } else {
          resolve(response as unknown);
        }
      });
    });
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
  method: (a0: T) => R,
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
    console.debug(`Installed background page handler for ${type}`);
    if (handlers[fullType]) {
      console.warn(`Handler already registered for ${fullType}`);
    }
    handlers[fullType] = { handler: method, options };
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
  chrome.runtime.onMessage.addListener(handleRequest);
  chrome.runtime.onMessageExternal.addListener(handleRequest);
}
