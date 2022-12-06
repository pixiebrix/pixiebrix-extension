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

import { SerializedError, UUID } from "@/core";
import { uuidv4 } from "@/types/helpers";
import pDefer from "p-defer";
import pTimeout from "p-timeout";
import { JsonValue, Promisable, RequireExactlyOne } from "type-fest";
import validUuidRegex from "@/vendors/validateUuid";

const TIMEOUT_MS = 3000;

type Payload = JsonValue;

type PixiebrixPacket = RequireExactlyOne<
  {
    id: string;
    payload: Payload;
    error: SerializedError;
    pixiebrix: UUID;
  },
  "payload" | "error"
>;

interface PostMessageInfo {
  id: string;
  payload?: Payload;
  channel: Window;
}

type PostMessageListener = (payload: Payload) => Promisable<Payload>;

/** Use the postMessage API but expect a response from the target */
export default async function postMessage({
  id,
  payload,
  channel,
}: PostMessageInfo): Promise<Payload> {
  const packet: PixiebrixPacket = {
    id,
    payload,
    pixiebrix: uuidv4(),
  };
  const { promise, resolve } = pDefer<Payload>();
  const controller = new AbortController();

  const listener = ({ origin, data }: MessageEvent<PixiebrixPacket>): void => {
    if (origin === "null" && data?.pixiebrix === packet.pixiebrix) {
      resolve(data.payload);
    }
  };

  window.addEventListener("message", listener, { signal: controller.signal });

  // The origin must be "*" because it's reported as "null" to the outside world
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#using_window.postmessage_in_extensions_non-standard
  channel.postMessage(packet, "*");

  try {
    return await pTimeout(promise, {
      milliseconds: TIMEOUT_MS,
      message: `Message ${id} did not receive a response within ${
        TIMEOUT_MS / 1000
      } seconds`,
    });
  } finally {
    controller.abort();
  }
}

export function addPostMessageListener(
  id: string,
  listener: PostMessageListener,
  { signal }: { signal?: AbortSignal } = {}
): void {
  const rawListener = async ({
    data,
    source,
    origin,
  }: MessageEvent<PixiebrixPacket>): Promise<void> => {
    if (data?.id === id && validUuidRegex.test(data.pixiebrix)) {
      const [response] = await Promise.allSettled([listener(data.payload)]);

      const packet: PixiebrixPacket = {
        id,
        pixiebrix: data.pixiebrix,
        ...("reason" in response
          ? { error: response.reason }
          : { payload: response.value }),
      };

      source.postMessage(packet, { targetOrigin: origin });
    }
  };

  window.addEventListener("message", rawListener, { signal });
}
