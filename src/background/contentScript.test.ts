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

import { waitForContentScript } from "@/background/contentScript";
import {
  CONTENT_SCRIPT_READY_NOTIFICATION,
  isTargetReady,
} from "@/contentScript/ready";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import { TEST_setContext } from "webext-detect";
import { type Runtime, type Tabs } from "webextension-polyfill";

TEST_setContext("background");

jest.mock("@/contentScript/ready");

let messageEvents:
  | SimpleEventTarget<{ message: unknown; sender: Runtime.MessageSender }>
  | undefined;

const addListenerMock = jest.mocked(browser.runtime.onMessage.addListener);
const isTargetReadyMock = jest.mocked(isTargetReady);

describe("waitForContentScript", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    messageEvents = new SimpleEventTarget();

    addListenerMock.mockImplementation(
      (
        listener: (
          message: any,
          sender: Runtime.MessageSender,
        ) => Promise<any> | true | void,
      ) => {
        // eslint-disable-next-line @typescript-eslint/promise-function-async -- Not on messaging APIs
        messageEvents!.add(({ message, sender }) => listener(message, sender));
      },
    );
  });

  it("contentScript already ready", async () => {
    isTargetReadyMock.mockResolvedValue(true);

    const first = waitForContentScript({ tabId: 1, frameId: 0 });
    const second = waitForContentScript({ tabId: 1, frameId: 0 });

    await Promise.all([
      expect(first).toFulfillWithinMilliseconds(20),
      expect(second).toFulfillWithinMilliseconds(20),
    ]);
  });

  it("wait for script to be ready in page", async () => {
    isTargetReadyMock.mockResolvedValue(false);

    const first = waitForContentScript({ tabId: 1, frameId: 0 });
    const second = waitForContentScript({ tabId: 1, frameId: 0 });
    await expect(first).toBePending();
    await expect(second).toBePending();

    messageEvents!.emit({
      message: { type: CONTENT_SCRIPT_READY_NOTIFICATION },
      sender: {
        id: browser.runtime.id,
        tab: { id: 1 } as Tabs.Tab,
        frameId: 0,
      },
    });
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
  });

  it("wait for script to be ready in page, with timeout", async () => {
    isTargetReadyMock.mockResolvedValue(false);

    const first = waitForContentScript({ tabId: 1, frameId: 0 }, 10);
    const second = waitForContentScript({ tabId: 1, frameId: 0 }, 10);
    await expect(first).toBePending();
    await expect(second).toBePending();

    await expect(first).rejects.toThrow("contentScript not ready in 10ms");
    await expect(second).rejects.toThrow("contentScript not ready in 10ms");
  });
});
