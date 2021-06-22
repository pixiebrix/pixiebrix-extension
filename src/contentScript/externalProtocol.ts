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

import { isExtensionContext } from "@/chrome";
import { v4 as uuidv4 } from "uuid";
import {
  HandlerEntry,
  HandlerOptions,
  isErrorResponse,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import { isContentScript } from "webext-detect-page";
import { deserializeError } from "serialize-error";
import { ContentScriptActionError } from "@/contentScript/backgroundProtocol";

const MESSAGE_PREFIX = "@@pixiebrix/external/";
const fulfilledSuffix = "_FULFILLED";
const rejectedSuffix = "_REJECTED";

function isResponseType(type = ""): boolean {
  return type.endsWith(fulfilledSuffix) || type.endsWith(rejectedSuffix);
}

const contentScriptHandlers = new Map<string, HandlerEntry>();
const pageFulfilledCallbacks = new Map<string, (response: unknown) => void>();
const pageRejectedCallbacks = new Map<string, (response: unknown) => void>();

function initContentScriptListener() {
  const targetOrigin = document.defaultView.origin;

  document.defaultView.addEventListener(
    "message",
    function (event: MessageEvent) {
      const { type, meta, payload } = event.data;
      const { handler, options: { asyncResponse } = { asyncResponse: true } } =
        contentScriptHandlers.get(type) ?? {};

      if (event.source === document.defaultView && handler) {
        const handlerPromise = new Promise((resolve) =>
          resolve(handler(...payload))
        );

        const send = (data: unknown, error = false) => {
          document.defaultView.postMessage(
            {
              type: `${type}${error ? rejectedSuffix : fulfilledSuffix}`,
              error,
              meta: { nonce: meta.nonce },
              payload: data,
            },
            targetOrigin
          );
        };

        handlerPromise
          .then((response) => {
            if (asyncResponse) {
              console.debug(
                `Handler returning success response for ${type} with nonce ${meta.nonce}`
              );
              send(response);
            }
          })
          .catch((error) => {
            if (asyncResponse) {
              console.debug(
                `Handler returning error response for ${type} with nonce ${meta.nonce}`
              );
              send(toErrorResponse(type, error), true);
            } else {
              console.warn(
                "An error occurred while processing notification %s",
                type,
                error
              );
            }
          });
        return asyncResponse;
      }
    }
  );
}

/**
 * Listener on the external webpage to listen for responses from the contentScript.
 */
function initExternalPageListener() {
  window.addEventListener("message", function (event: MessageEvent) {
    const { type, meta, error, payload } = event.data;
    if (
      // check isResponseType to make sure we're not handling the messages from the content script
      event.source === document.defaultView &&
      isResponseType(type) &&
      meta?.nonce
    ) {
      const callback = (error
        ? pageRejectedCallbacks
        : pageFulfilledCallbacks
      ).get(meta.nonce);
      if (!callback) {
        console.warn(`Ignoring message with unknown nonce: ${meta.nonce}`);
        return;
      }
      try {
        const response = isErrorResponse(payload)
          ? deserializeError(payload.$$error)
          : payload;
        callback(response);
      } finally {
        pageFulfilledCallbacks.delete(meta.nonce);
        pageRejectedCallbacks.delete(meta.nonce);
      }
    } else if (type) {
      console.debug("Ignoring message: %s", type, event);
    }
  });
}

export function liftExternal<R extends SerializableResponse>(
  type: string,
  method: () => R | Promise<R>,
  options?: HandlerOptions
): () => Promise<R>;
export function liftExternal<T, R extends SerializableResponse>(
  type: string,
  method: (a0: T) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T) => Promise<R>;
export function liftExternal<T0, T1, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T0, a1: T1) => Promise<R>;
export function liftExternal<T0, T1, T2, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T0, a1: T1, a2: T2) => Promise<R>;
export function liftExternal<T0, T1, T2, T3, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2, a3: T3) => R | Promise<R>,
  options?: HandlerOptions
): (a0: T0, a1: T1, a2: T2, a3: T3) => Promise<R>;
export function liftExternal<R extends SerializableResponse>(
  type: string,
  method: (...args: unknown[]) => R | Promise<R>,
  options?: HandlerOptions
): (tabId: number, ...args: unknown[]) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isContentScript()) {
    // console.debug(`Installed content script handler for ${type}`);
    contentScriptHandlers.set(fullType, { handler: method, options });
  }

  const targetOrigin = document.defaultView.origin;

  return async (...args: unknown[]) => {
    if (isContentScript()) {
      console.debug("Resolving call from the contentScript immediately");
      return method(...args);
    } else if (isExtensionContext()) {
      throw new ContentScriptActionError("Expected call from external page");
    }
    return new Promise((resolve, reject) => {
      const nonce = uuidv4();
      pageFulfilledCallbacks.set(nonce, resolve);
      pageRejectedCallbacks.set(nonce, reject);
      const message = {
        type: fullType,
        payload: args,
        error: false,
        meta: { nonce },
      };
      console.debug("Sending message from page to content script", message);
      document.defaultView.postMessage(message, targetOrigin);
    });
  };
}

function addExternalListener(): void {
  if (isContentScript()) {
    initContentScriptListener();
  } else if (!isExtensionContext()) {
    initExternalPageListener();
  } else {
    throw new Error(
      "addExternalListener can only be called from the content script or an external page"
    );
  }
}

export default addExternalListener;
