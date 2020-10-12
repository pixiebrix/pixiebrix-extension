import { getChromeExtensionId, RuntimeNotFoundError } from "@/chrome";
import {
  isBackgroundPage,
  isContentScript,
  isOptionsPage,
} from "webext-detect-page";
import { serializeError, deserializeError } from "serialize-error";
import { isEmpty, partial } from "lodash";
import { SerializedError } from "@/core";

const MESSAGE_PREFIX = "@@pixiebrix/background/";

export class BackgroundActionError extends Error {
  errors: unknown;

  constructor(message: string) {
    super(message);
    this.name = "BackgroundActionError";
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
type SerializableResponse = object;

type HandlerOptions = {
  asyncResponse?: boolean;
};

type Handler = (...args: unknown[]) => SerializableResponse;

type HandlerEntry = {
  handler: Handler;
  options: HandlerOptions;
};

const handlers: { [key: string]: HandlerEntry } = {};

interface ErrorResponse {
  $$error: SerializedError;
}

function isErrorResponse(ex: unknown): ex is ErrorResponse {
  return typeof ex === "object" && ex != null && "$$error" in ex;
}

function toErrorResponse(requestType: string, ex: unknown): ErrorResponse {
  return { $$error: serializeError(ex) };
}

function initListener(messageEvent: chrome.runtime.ExtensionMessageEvent) {
  messageEvent.addListener(function (request, sender, sendResponse) {
    const { handler, options: { asyncResponse } = { asyncResponse: true } } =
      handlers[request.type] ?? {};
    if (handler) {
      const handlerPromise = new Promise((resolve) =>
        resolve(handler(...request.payload))
      );
      handlerPromise
        .then((x) => sendResponse(x))
        .catch(partial(toErrorResponse, request.type));
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
