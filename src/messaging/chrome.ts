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

type SendScriptMessage<TReturn = unknown, TPayload = unknown> = (
  payload: TPayload
) => Promise<TReturn>;

type CallbackMap = { [key: string]: (result: unknown) => void };

export function createSendScriptMessage<TReturn = unknown, TPayload = unknown>(
  messageType: string
): SendScriptMessage<TReturn, TPayload> {
  if (typeof document === "undefined" || document.defaultView == null) {
    return () => Promise.reject("Not running in a browser context");
  }

  let messageSeq = 0;
  const targetOrigin = document.defaultView.origin;
  const fulfillmentCallbacks: CallbackMap = {};
  const rejectionCallbacks: CallbackMap = {};

  const listen = (type: string, callbacks: CallbackMap) => {
    document.addEventListener(type, function (event: CustomEvent) {
      if (!event.detail) {
        throw new Error(`Handler for ${type} did not provide event detail`);
      }
      const { id, result } = event.detail;
      // This listener also receives it's own FULFILLED/REJECTED messages it sends back to the content
      // script. So if you add any logging outside of the if, the logs are confusing.
      if (Object.prototype.hasOwnProperty.call(callbacks, id)) {
        try {
          callbacks[id](result);
        } finally {
          delete fulfillmentCallbacks[id];
          delete rejectionCallbacks[id];
        }
      }
    });
  };

  listen(`${messageType}_FULFILLED`, fulfillmentCallbacks);
  listen(`${messageType}_REJECTED`, rejectionCallbacks);

  return (payload: TPayload) => {
    const id = messageSeq++;
    const promise = new Promise((resolve, reject) => {
      fulfillmentCallbacks[id] = resolve;
      rejectionCallbacks[id] = reject;
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
