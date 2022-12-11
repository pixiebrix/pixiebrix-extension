/* eslint-disable unicorn/prefer-add-event-listener -- `onmessage` is preferred due to `MessagePort#start` */
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

/**
 * @file and security
 * 1. The content script generates an iframe with a local document.
 * 2. postMessage only works with `"*"` in this direction
 *    https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#using_window.postmessage_in_extensions_non-standard
 * 3. The iframe is safe because it's local and wrapped in a Shadow DOM,
 *    thus inaccessible/not-alterable by the host website.
 * 4. Each content script message includes a private channel port that the
 *    iframe can use to respond exclusively to the content script.
 * 5. The channel is closed immediately after the response.
 *
 * Prior art: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/IPJSfjNSgh8/m/Dh35-tZPAgAJ
 * Relevant discussion: https://github.com/w3c/webextensions/issues/78
 */

import { type SerializedError, type UUID } from "@/core";
import { uuidv4 } from "@/types/helpers";
import pDefer from "p-defer";
import pTimeout from "p-timeout";
import { deserializeError, serializeError } from "serialize-error";
import { type JsonValue, type RequireExactlyOne } from "type-fest";

const TIMEOUT_MS = 3000;

type Payload = JsonValue;

type PixiebrixPacket = RequireExactlyOne<
  {
    type: string;
    payload: Payload;
    error: SerializedError;
    nonce: UUID;
  },
  "payload" | "error"
>;

interface PostMessageInfo {
  type: string;
  payload?: Payload;
  recipient: Window;
}

type PostMessageListener = (payload: Payload) => Promise<Payload>;

/** Use the postMessage API but expect a response from the target */
export default async function postMessage({
  type,
  payload,
  recipient,
}: PostMessageInfo): Promise<Payload> {
  const { promise, resolve, reject } = pDefer<Payload>();
  const privateChannel = new MessageChannel();
  privateChannel.port1.onmessage = ({
    data,
  }: MessageEvent<PixiebrixPacket>): void => {
    if (data.error) {
      reject(deserializeError(data.error));
    } else {
      resolve(data.payload);
    }
  };

  console.debug("SANDBOX: Posting", type, "with payload:", payload);
  const packet: PixiebrixPacket = {
    type,
    payload,
    nonce: uuidv4(),
  };
  // The origin must be "*". See note in @file
  recipient.postMessage(packet, "*", [privateChannel.port2]);

  try {
    return await pTimeout(promise, {
      milliseconds: TIMEOUT_MS,
      message: `Message ${type} did not receive a response within ${
        TIMEOUT_MS / 1000
      } seconds`,
    });
  } finally {
    privateChannel.port1.onmessage = null;
  }
}

export function addPostMessageListener(
  type: string,
  listener: PostMessageListener,
  { signal }: { signal?: AbortSignal } = {}
): void {
  const rawListener = async ({
    data,
    ports: [source],
  }: MessageEvent<PixiebrixPacket>): Promise<void> => {
    if (data?.type !== type) {
      return;
    }

    console.debug("SANDBOX: Received", type, "payload:", data.payload);

    const [response] = await Promise.allSettled([listener(data.payload)]);

    console.debug("SANDBOX: Responding to", type, "with", response);

    const packet: PixiebrixPacket = {
      type,
      nonce: data.nonce,
      ...("reason" in response
        ? { error: serializeError(response.reason) }
        : { payload: response.value }),
    };

    console.log(source);

    source.postMessage(packet);
  };

  window.addEventListener("message", rawListener, { signal });
}
