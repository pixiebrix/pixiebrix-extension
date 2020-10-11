import { getChromeExtensionId, RuntimeNotFoundError } from "@/chrome";
import { isBackgroundPage, isContentScript } from "webext-detect-page";
import { isEmpty, partial } from "lodash";

export class MessageError extends Error {
  errors: unknown;

  constructor(message: string) {
    super(message);
    this.name = "BackgroundActionError";
  }
}

// copied from redux-toolkit: https://redux-toolkit.js.org/api/createAsyncThunk#promise-lifecycle-actions
export interface SerializedError {
  name?: string;
  message?: string;
  code?: string;
  stack?: string;
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

const contentScriptHandlers: { [key: string]: HandlerEntry } = {};
const externalHandlers: { [key: string]: HandlerEntry } = {};

function initListener(
  messageEvent: chrome.runtime.ExtensionMessageEvent,
  handlers: { [key: string]: HandlerEntry }
) {
  messageEvent.addListener(function (request, sender, sendResponse) {
    const { handler, options: { asyncResponse } = { asyncResponse: true } } =
      handlers[request.type] ?? {};
    if (handler) {
      const handlerPromise = new Promise((resolve) =>
        resolve(handler(...request.payload))
      );
      handlerPromise
        .then((x) => sendResponse(x))
        .catch((ex) => {
          if (typeof ex === "string") {
            sendResponse({ $$error: { message: ex } });
          } else if (typeof ex === "object") {
            sendResponse({ $$error: ex });
          } else {
            sendResponse({
              $$error: { message: `Unknown error processing ${request.type}` },
            });
          }
        });
      return asyncResponse;
    }
    return false;
  });
}

if (isBackgroundPage()) {
  initListener(chrome.runtime.onMessage, contentScriptHandlers);
  initListener(chrome.runtime.onMessageExternal, externalHandlers);
}

function getExternalSendMessage() {
  const extensionId = getChromeExtensionId();
  if (chrome.runtime == null) {
    throw new RuntimeNotFoundError(
      "Chrome runtime is unavailable; is extension externally connectable?"
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
export function liftBackground<R extends SerializableResponse>(
  type: string,
  method: (...args: unknown[]) => R,
  options?: HandlerOptions
): (...args: unknown[]) => Promise<R> {
  const fullType = `@@pixiebrix/background/${type}`;

  const handlerDict = isContentScript()
    ? contentScriptHandlers
    : externalHandlers;
  handlerDict[fullType] = { handler: method, options };

  return (...args: unknown[]) => {
    if (isBackgroundPage()) {
      throw new Error("Unexpected call from the background page");
    }

    const sendMessage: any = isContentScript()
      ? chrome.runtime.sendMessage
      : getExternalSendMessage();

    return new Promise((resolve, reject) => {
      sendMessage({ type: fullType, payload: args }, function (response: any) {
        if (chrome.runtime.lastError == null) {
          if (typeof response === "object" && response["$$error"]) {
            const error = new Error(response["$$error"].message);
            error.name = response["$$error"].name ?? "Error";
            error.stack = response["$$error"].stack;
            reject(error);
          } else {
            resolve(response);
          }
        } else {
          reject(new MessageError(chrome.runtime.lastError.message));
        }
      });
      if (chrome.runtime.lastError != null) {
        reject(new MessageError(chrome.runtime.lastError.message));
      }
    });
  };
}
