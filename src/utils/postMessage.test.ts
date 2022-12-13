/**
 * @jest-environment-options {"resources": "usable", "runScripts": "dangerously"}
 */
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

import { sleep } from "@/utils";
import polyfill from "node:worker_threads";
import { serializeError } from "serialize-error";
import postMessage, {
  addPostMessageListener,
  type RequestPacket,
} from "./postMessage";

(global as any).MessageChannel = polyfill.MessageChannel;
(global as any).MessagePort = polyfill.MessagePort;

afterEach(jest.restoreAllMocks);

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

describe("addPostMessageListener", () => {
  // TODO: Skip due to lack of jsdom support for Transfer
  //   https://github.com/jsdom/jsdom/issues/3287
  //   For this reason, we have to mock the whole native postMessage API
  test.skip("handle received packet (real API)", async () => {
    const controller = new AbortController();
    const { signal } = controller;

    const callback = jest.fn();
    const packet: RequestPacket = { type: "SANDBOX_PING", payload: "ball" };
    const privateChannel = new MessageChannel();
    addPostMessageListener("SANDBOX_PING", callback, { signal });
    window.postMessage(packet, "*", [privateChannel.port2]);

    await sleep(100);
    expect(callback).toHaveBeenCalledWith("ball");

    // Cleanup listener
    controller.abort();
  });

  test("handle received packet (mocked API)", async () => {
    const callback = jest.fn();
    const packet: RequestPacket = { type: "SANDBOX_PING", payload: "ball" };

    const privateChannel = new MessageChannel();
    jest
      .spyOn(window, "addEventListener")
      .mockImplementation((type, listener: EventListener) => {
        if (type === "message") {
          listener(
            new MessageEvent("message", {
              data: packet,
              ports: [privateChannel.port2],
            })
          );
        }
      });
    addPostMessageListener("SANDBOX_PING", callback);

    // Implied by `addEventListener`’s mock
    // window.postMessage(packet, "*", [privateChannel.port2]);

    await sleep(100);
    expect(callback).toHaveBeenCalledWith("ball");
  });

  test("ignores unrelated packets", async () => {
    const controller = new AbortController();
    const { signal } = controller;

    const callback = jest.fn();
    const packet: RequestPacket = { type: "SANDBOX_CASTLE", payload: 1583 };
    addPostMessageListener("SANDBOX_PING", callback, { signal });
    window.postMessage(packet, "*");

    await sleep(100);
    expect(callback).not.toHaveBeenCalled();

    // Cleanup listener
    controller.abort();
  });

  test("ignores unrelated messages", async () => {
    const controller = new AbortController();
    const { signal } = controller;

    const callback = jest.fn();
    addPostMessageListener("SANDBOX_PING", callback, { signal });
    window.postMessage("Give me all you got", "*");

    await sleep(100);
    expect(callback).not.toHaveBeenCalled();

    // Cleanup listener
    controller.abort();
  });
});
