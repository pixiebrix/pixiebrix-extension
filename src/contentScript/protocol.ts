import {
  HandlerEntry,
  HandlerOptions,
  isErrorResponse,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import { isBackgroundPage, isContentScript } from "webext-detect-page";
import { deserializeError } from "serialize-error";
import { BackgroundActionError } from "@/background/protocol";

const MESSAGE_PREFIX = "@@pixiebrix/contentScript/";

export class ContentScriptActionError extends Error {
  errors: unknown;

  constructor(message: string) {
    super(message);
    this.name = "ContentScriptActionError";
  }
}

const handlers: { [key: string]: HandlerEntry } = {};

function initListener(messageEvent: chrome.runtime.ExtensionMessageEvent) {
  messageEvent.addListener(function (request, sender, sendResponse) {
    const { handler, options: { asyncResponse } = { asyncResponse: true } } =
      handlers[request.type] ?? {};
    if (handler) {
      console.debug(`Handling contentScript action ${request.type}`);
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

/**
 * Lift a method to be run on the background page
 * @param type a unique name for the background action
 * @param method the method to lift
 * @param options background action handler options
 */
export function liftContentScript<R extends SerializableResponse>(
  type: string,
  method: () => R,
  options?: HandlerOptions
): (tabId: number | null) => Promise<R>;
export function liftContentScript<T, R extends SerializableResponse>(
  type: string,
  method: (a0: T) => R,
  options?: HandlerOptions
): (tabId: number | null, a0: T) => Promise<R>;
export function liftContentScript<T0, T1, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1) => R,
  options?: HandlerOptions
): (tabId: number | null, a0: T0, a1: T1) => Promise<R>;
export function liftContentScript<T0, T1, T2, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2) => R,
  options?: HandlerOptions
): (tabId: number | null, a0: T0, a1: T1, a2: T2) => Promise<R>;
export function liftContentScript<
  T0,
  T1,
  T2,
  T3,
  R extends SerializableResponse
>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2, a3: T3) => R,
  options?: HandlerOptions
): (tabId: number | null, a0: T0, a1: T1, a2: T2, a3: T3) => Promise<R>;
export function liftContentScript<R extends SerializableResponse>(
  type: string,
  method: (...args: unknown[]) => R,
  options?: HandlerOptions
): (tabId: number | null, ...args: unknown[]) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isContentScript()) {
    console.debug(`Installed content script handler for ${type}`);
    handlers[fullType] = { handler: method, options };
  }

  return (tabId: number | null, ...args: unknown[]) => {
    if (isContentScript()) {
      return Promise.resolve(method(...args));
    } else if (!isBackgroundPage()) {
      return Promise.reject(
        new ContentScriptActionError(
          "Unexpected call from origin other than the background page"
        )
      );
    }

    console.debug(
      `Sending content script action ${fullType} to tab: ${tabId ?? "<all>"}`
    );

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tabId,
        { type: fullType, payload: args },
        function (response: unknown) {
          if (chrome.runtime.lastError != null) {
            reject(new BackgroundActionError(chrome.runtime.lastError.message));
          } else if (isErrorResponse(response)) {
            reject(deserializeError(response.$$error));
          } else {
            // Must have the expected type given liftBackground's type signature
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resolve(response as any);
          }
        }
      );
      if (chrome.runtime.lastError != null) {
        reject(new BackgroundActionError(chrome.runtime.lastError.message));
      }
    });
  };
}

if (isContentScript()) {
  initListener(chrome.runtime.onMessage);
}
