/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { once } from "lodash";
import { logPromiseDuration } from "../../utils/promiseUtils";
import injectScriptTag from "../../utils/injectScriptTag";
import { expectContext } from "../../utils/expectContext";

type SendScriptMessage<TReturn = unknown, TPayload = unknown> = (
  payload: TPayload,
) => Promise<TReturn>;

type CallbackMap = Map<number, (result: unknown) => void>;

function assertCustomEvent(
  type: string,
  event: Event,
): asserts event is CustomEvent<{
  id: number;
  result?: unknown;
  error?: unknown;
}> {
  if (!(event instanceof CustomEvent) || event.detail.id == null) {
    throw new TypeError(
      `Handler for ${type} did not provide a detail property`,
    );
  }
}

const injectPageScriptOnce = once(async (): Promise<void> => {
  expectContext("contentScript");

  console.debug("Injecting page script");
  const script = await logPromiseDuration(
    "injectPageScript",
    // Must use chrome namespace instead for browser namespace because there are bricks that call into this method,
    // and the bricks are statically imported into other contexts. For example,
    injectScriptTag(browser.runtime.getURL("pageScript.js")),
  );
  script.remove();
});

export function createSendScriptMessage<TReturn = unknown, TPayload = unknown>(
  messageType: string,
): SendScriptMessage<TReturn, TPayload> {
  const currentWindow = globalThis.document?.defaultView;
  if (!currentWindow) {
    return async () => {
      throw new Error("Not running in a browser context");
    };
  }

  let messageSeq = 0;
  const targetOrigin = currentWindow.origin;
  const fulfillmentCallbacks = new Map() as CallbackMap;
  const rejectionCallbacks = new Map() as CallbackMap;

  const listen = (
    type: string,
    callbacks: CallbackMap,
    prop: "result" | "error",
  ) => {
    document.addEventListener(type, (event: Event) => {
      assertCustomEvent(type, event);

      const { id } = event.detail;
      // This listener also receives its own FULFILLED/REJECTED messages it sends back to the content
      // script. So if you add any logging outside the `if`, the logs are confusing.
      const callback = callbacks.get(id);

      if (callback != null) {
        // Clean up callbacks
        fulfillmentCallbacks.delete(id);
        rejectionCallbacks.delete(id);

        // eslint-disable-next-line security/detect-object-injection -- Only getting called with "result" or "error"
        callback(event.detail[prop]);
      }
    });
  };

  listen(`${messageType}_FULFILLED`, fulfillmentCallbacks, "result");
  listen(`${messageType}_REJECTED`, rejectionCallbacks, "error");

  return async (payload: TPayload) => {
    // Since 1.8.2: load the pageScript on demand, because it's only used by the Page Editor and a limited number of
    // bricks. Previously it was loaded in the page lifecycle, which also impacted mod readiness
    await injectPageScriptOnce();

    const id = messageSeq++;
    const promise = new Promise((resolve, reject) => {
      fulfillmentCallbacks.set(id, resolve);
      rejectionCallbacks.set(id, reject);
    });
    console.debug(
      `Messaging pageScript (origin: ${targetOrigin}): ${messageType}`,
      payload,
    );

    // As an alternative to postMessage, could potentially use cloneInto and CustomEvent's but that
    // appears to be deprecated: https://bugzilla.mozilla.org/show_bug.cgi?id=1294935
    currentWindow.postMessage(
      {
        type: messageType,
        meta: { id },
        payload,
      },
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#Security_concerns
      // Security: always specify an exact target origin, not *, when you use postMessage to send data to other windows.
      targetOrigin,
    );

    return promise as Promise<TReturn>;
  };
}
