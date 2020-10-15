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
import MessageSender = chrome.runtime.MessageSender;
import {
  HandlerEntry,
  SerializableResponse,
  HandlerOptions,
  toErrorResponse,
  isErrorResponse,
} from "@/messaging/protocol";

const MESSAGE_PREFIX = "@@pixiebrix/background/";

export class BackgroundActionError extends Error {
  errors: unknown;

  constructor(message: string) {
    super(message);
    this.name = "BackgroundActionError";
  }
}

const handlers: { [key: string]: HandlerEntry } = {};

/**
 * Return true if a message sender is either the extension itself, or an externally connectable page
 * https://developer.chrome.com/extensions/security#sanitize
 */
function allowSender(sender: MessageSender): boolean {
  const { externally_connectable } = chrome.runtime.getManifest();
  return (
    sender.id === chrome.runtime.id ||
    externally_connectable.matches.some((x) =>
      matchPattern.parse(x).test(sender.origin)
    )
  );
}

function initListener(messageEvent: chrome.runtime.ExtensionMessageEvent) {
  messageEvent.addListener(function (request, sender, sendResponse) {
    if (!allowSender(sender)) {
      console.debug(`Ignoring message to background page`, sender);
      return false;
    }

    const { handler, options: { asyncResponse } = { asyncResponse: true } } =
      handlers[request.type] ?? {};

    if (handler) {
      console.debug(`Handling background action ${request.type}`);
      const handlerPromise = new Promise((resolve) =>
        resolve(handler(...request.payload))
      );
      handlerPromise
        .then((x) => {
          console.debug(
            `Handler returning success response for ${request.type}`
          );
          sendResponse(x);
        })
        .catch((x) => {
          console.debug(`Handler returning error response for ${request.type}`);
          sendResponse(toErrorResponse(request.type, x));
        });
      return asyncResponse;
    } else if (request.type.startsWith(MESSAGE_PREFIX)) {
      console.warn(`No handler installed for message ${request.type}`);
    }
    return false;
  });
}

function getExternalSendMessage() {
  const extensionId = getChromeExtensionId();
  if (chrome.runtime == null) {
    throw new RuntimeNotFoundError(
      "Chrome runtime is unavailable; is the extension externally connectable?"
    );
  } else if (isEmpty(extensionId)) {
    throw new Error("Could not find chrome extension id");
  }
  return partial(chrome.runtime.sendMessage, extensionId);
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
    handlers[fullType] = { handler: method, options };
  }

  return (...args: unknown[]) => {
    if (isBackgroundPage()) {
      return Promise.resolve(method(...args));
    }

    console.debug(`Sending background action ${fullType}`);

    const sendMessage: any =
      isContentScript() || isOptionsPage()
        ? chrome.runtime.sendMessage
        : getExternalSendMessage();

    return new Promise((resolve, reject) => {
      sendMessage({ type: fullType, payload: args }, function (
        response: unknown
      ) {
        if (chrome.runtime.lastError != null) {
          reject(new BackgroundActionError(chrome.runtime.lastError.message));
        } else if (isErrorResponse(response)) {
          reject(deserializeError(response.$$error));
        } else {
          // Must have the expected type given liftBackground's type signature
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resolve(response as any);
        }
      });
      if (chrome.runtime.lastError != null) {
        reject(new BackgroundActionError(chrome.runtime.lastError.message));
      }
    });
  };
}

if (isBackgroundPage()) {
  initListener(chrome.runtime.onMessage);
  initListener(chrome.runtime.onMessageExternal);
}
