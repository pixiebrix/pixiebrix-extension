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

import { serializeError } from "serialize-error";
import postMessage, { addPostMessageListener } from "./postMessage";

describe("postMessage", () => {
  test("post message and receive answer", async () => {
    const channel = {
      postMessage(message: unknown, _: string, [port]: MessagePort[]): void {
        expect(message).toStrictEqual({
          type: "SANDBOX_PING",
          payload: undefined,
        });
        expect(port).toBeInstanceOf(MessagePort);
        port.postMessage({ response: "pong" });
      },
    };

    await expect(
      postMessage({
        type: "SANDBOX_PING",
        recipient: channel as Window,
      })
    ).resolves.toBe("pong");
  });

  test("post message and receive error", async () => {
    const channel = {
      postMessage(_: unknown, __: string, [port]: MessagePort[]): void {
        port.postMessage({
          error: serializeError(new Error("No balls found")),
        });
      },
    };

    await expect(
      postMessage({
        type: "SANDBOX_PING",
        recipient: channel as Window,
      })
    ).rejects.toMatchInlineSnapshot("[Error: No balls found]");
  });
});
