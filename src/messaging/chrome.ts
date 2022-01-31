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

type SendScriptMessage<TReturn = unknown, TPayload = unknown> = (
  payload: TPayload
) => Promise<TReturn>;

type CallbackMap = Map<number, (result: unknown) => void>;

export function createSendScriptMessage<TReturn = unknown, TPayload = unknown>(
  messageType: string
): SendScriptMessage<TReturn, TPayload> {
  if (typeof document === "undefined" || document.defaultView == null) {
    return async () => {
      throw new Error("Not running in a browser context");
    };
  }

  let messageSeq = 0;
  const targetOrigin = document.defaultView.origin;
  const fulfillmentCallbacks: CallbackMap = new Map();
  const rejectionCallbacks: CallbackMap = new Map();

  const listen = (
    type: string,
    callbacks: CallbackMap,
    prop: "result" | "error"
  ) => {
    document.addEventListener(type, (event: CustomEvent) => {
      if (!event.detail) {
        throw new Error(
          `Handler for ${type} did not provide a detail property`
        );
      }

      const { id } = event.detail;
      // This listener also receives it's own FULFILLED/REJECTED messages it sends back to the content
      // script. So if you add any logging outside of the if, the logs are confusing.
      const callback = callbacks.get(id);

      if (callback != null) {
        // Clean up callbacks
        fulfillmentCallbacks.delete(id);
        rejectionCallbacks.delete(id);

        // Only getting called with "result" or "error"
        // eslint-disable-next-line security/detect-object-injection
        callback(event.detail[prop]);
      }
    });
  };

  listen(`${messageType}_FULFILLED`, fulfillmentCallbacks, "result");
  listen(`${messageType}_REJECTED`, rejectionCallbacks, "error");

  return async (payload: TPayload) => {
    const id = messageSeq++;
    const promise = new Promise((resolve, reject) => {
      fulfillmentCallbacks.set(id, resolve);
      rejectionCallbacks.set(id, reject);
    });
    console.debug(
      `Messaging pageScript (origin: ${targetOrigin}): ${messageType}`,
      payload
    );

    // As an alternative to postMessage, could potentially use cloneInto and CustomEvent's but that
    // appears to be deprecated: https://bugzilla.mozilla.org/show_bug.cgi?id=1294935
    document.defaultView.postMessage(
      {
        type: messageType,
        meta: { id },
        payload,
      },
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#Security_concerns
      // Security: always specify an exact target origin, not *, when you use postMessage to send data to other windows.
      targetOrigin
    );

    return promise as Promise<TReturn>;
  };
}
