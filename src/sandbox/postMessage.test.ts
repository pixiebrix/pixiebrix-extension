/*
 * @jest-environment-options {"resources": "usable", "runScripts": "dangerously"}
 */
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

import polyfill from "node:worker_threads";
import { serializeError } from "serialize-error";
import postMessage, {
  addPostMessageListener,
  pendingMessageMetadataMap,
  type RequestPacket,
  SandboxTimeoutError,
} from "./postMessage";
import { sleep } from "@/utils/timeUtils";

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
        port!.postMessage({ response: "pong" });
      },
    };

    await expect(
      postMessage({
        type: "SANDBOX_PING",
        recipient: channel as Window,
      }),
    ).resolves.toBe("pong");
  });

  test("post message and receive error", async () => {
    const channel = {
      postMessage(_: unknown, __: string, [port]: MessagePort[]): void {
        port!.postMessage({
          error: serializeError(new Error("No balls found")),
        });
      },
    };

    await expect(
      postMessage({
        type: "SANDBOX_PING",
        recipient: channel as Window,
      }),
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
            }),
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

describe("SandboxTimeoutError", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("throws SandboxTimeoutError with correct information for single message", async () => {
    const channel = {
      postMessage(_: unknown, __: string, [port]: MessagePort[]): void {
        // Don't respond to simulate a timeout
      },
    };

    const promise = postMessage({
      type: "SANDBOX_PING",
      payload: { data: "test" },
      recipient: channel as Window,
    });

    jest.runAllTimers();

    await expect(promise).rejects.toThrow(SandboxTimeoutError);
    await expect(promise).rejects.toMatchObject({
      name: "SandboxTimeoutError",
      message:
        "Message SANDBOX_PING did not receive a response within 5 seconds",
      sandboxMessage: {
        type: "SANDBOX_PING",
        payloadSize: expect.any(Number),
        timestamp: expect.any(Number),
      },
      pendingSandboxMessages: [],
    });
  });

  test("throws SandboxTimeoutError with correct information for multiple messages", async () => {
    const unresponsiveChannel = {
      postMessage(_: unknown, __: string, [___]: MessagePort[]): void {
        // Don't respond to simulate a timeout
      },
    };

    const promise1 = postMessage({
      type: "SANDBOX_FOO",
      payload: { data: "test1" },
      recipient: unresponsiveChannel as Window,
    });

    const promise2 = postMessage({
      type: "SANDBOX_BAR",
      payload: { data: "test2" },
      recipient: unresponsiveChannel as Window,
    });

    jest.runAllTimers();

    const promise3 = postMessage({
      type: "SANDBOX_BAZ",
      payload: { data: "test3" },
      recipient: unresponsiveChannel as Window,
    });

    await expect(promise1).rejects.toThrow(SandboxTimeoutError);
    await expect(promise1).rejects.toMatchObject({
      name: "SandboxTimeoutError",
      message:
        "Message SANDBOX_FOO did not receive a response within 5 seconds",
      sandboxMessage: {
        type: "SANDBOX_FOO",
        payloadSize: expect.any(Number),
        timestamp: expect.any(Number),
      },
      pendingSandboxMessages: expect.arrayContaining([
        {
          type: "SANDBOX_BAR",
          payloadSize: expect.any(Number),
          timestamp: expect.any(Number),
        },
        {
          type: "SANDBOX_BAZ",
          payloadSize: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ]),
    });

    await expect(promise2).rejects.toThrow(SandboxTimeoutError);
    await expect(promise2).rejects.toMatchObject({
      name: "SandboxTimeoutError",
      message:
        "Message SANDBOX_BAR did not receive a response within 5 seconds",
      sandboxMessage: {
        type: "SANDBOX_BAR",
        payloadSize: expect.any(Number),
        timestamp: expect.any(Number),
      },
      pendingSandboxMessages: expect.arrayContaining([
        {
          type: "SANDBOX_BAZ",
          payloadSize: expect.any(Number),
          timestamp: expect.any(Number),
        },
      ]),
    });

    jest.runAllTimers();
    await expect(promise3).rejects.toThrow(SandboxTimeoutError);
    await expect(promise3).rejects.toMatchObject({
      name: "SandboxTimeoutError",
      message:
        "Message SANDBOX_BAZ did not receive a response within 5 seconds",
      sandboxMessage: {
        type: "SANDBOX_BAZ",
        payloadSize: expect.any(Number),
        timestamp: expect.any(Number),
      },
      pendingSandboxMessages: [],
    });
  });

  test("clears metadata for resolved messages", async () => {
    const channel = {
      postMessage(_: unknown, __: string, [port]: MessagePort[]): void {
        setTimeout(() => {
          port!.postMessage({ response: "pong" });
        }, 100);
      },
    };

    const promise = postMessage({
      type: "SANDBOX_PING",
      recipient: channel as Window,
    });

    expect(pendingMessageMetadataMap).toEqual(
      new Map([
        [
          expect.any(String),
          {
            type: "SANDBOX_PING",
            payloadSize: null,
            timestamp: expect.any(Number),
          },
        ],
      ]),
    );

    jest.advanceTimersByTime(100);
    await expect(promise).resolves.toBe("pong");

    expect(pendingMessageMetadataMap).toEqual(new Map());
  });
});
