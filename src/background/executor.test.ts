/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { requestRunInAllFrames } from "@/background/executor";
import {
  registryIdFactory,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import { type MessengerMeta, type Sender } from "webext-messenger";
import { runBrick } from "@/contentScript/messenger/api";
import { type WebNavigation } from "webextension-polyfill";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { define, derive } from "cooky-cutter";
import { type RemoteBrickOptions } from "@/contentScript/messenger/runBrickTypes";

type GetAllFramesCallbackDetailsItemType =
  WebNavigation.GetAllFramesCallbackDetailsItemType;

browser.webNavigation.getAllFrames = jest.fn();

jest.mock("@/contentScript/messenger/api", () => ({
  runBrick: jest.fn().mockRejectedValue(new Error("Mock not implemented")),
}));

const getAllFramesMock = jest.mocked(browser.webNavigation.getAllFrames);
const runBrickMock = jest.mocked(runBrick);

const optionsFactory = define<RemoteBrickOptions>({
  ctxt: () => ({}),
  messageContext: (i: number) => ({
    extensionId: uuidSequence(i),
  }),
  meta: derive<RemoteBrickOptions, RemoteBrickOptions["meta"]>(
    (options) => ({
      extensionId: options.messageContext.extensionId,
      runId: null,
      branches: [],
    }),
    "messageContext"
  ),
});

beforeEach(() => {
  runBrickMock.mockClear();
  getAllFramesMock.mockClear();
});

describe("requestRunInAllFrames", () => {
  it("run in no frames", async () => {
    // Not really possible because the top-level frame will always be there
    getAllFramesMock.mockResolvedValue([]);

    const meta: MessengerMeta = {
      trace: [
        {
          tab: {
            id: 42,
          },
        } as Sender,
      ],
    };

    const promise = requestRunInAllFrames.call(meta, {
      blockId: registryIdFactory(),
      blockArgs: unsafeAssumeValidArg({}),
      options: optionsFactory(),
    });
    await expect(promise).resolves.toStrictEqual([]);
  });

  it("excludes rejected", async () => {
    getAllFramesMock.mockResolvedValue([
      {
        frameId: 0,
      } as GetAllFramesCallbackDetailsItemType,
    ]);

    const meta: MessengerMeta = {
      trace: [
        {
          tab: {
            id: 42,
          },
        } as Sender,
      ],
    };

    const promise = requestRunInAllFrames.call(meta, {
      blockId: registryIdFactory(),
      blockArgs: unsafeAssumeValidArg({}),
      options: optionsFactory(),
    });

    await expect(promise).resolves.toStrictEqual([]);
  });

  it("returns value", async () => {
    getAllFramesMock.mockResolvedValue([
      {
        frameId: 0,
      } as GetAllFramesCallbackDetailsItemType,
    ]);

    runBrickMock.mockResolvedValue({ foo: 42 });

    const meta: MessengerMeta = {
      trace: [
        {
          tab: {
            id: 42,
          },
        } as Sender,
      ],
    };

    const promise = requestRunInAllFrames.call(meta, {
      blockId: registryIdFactory(),
      blockArgs: unsafeAssumeValidArg({}),
      options: optionsFactory(),
    });

    await expect(promise).resolves.toStrictEqual([{ foo: 42 }]);
  });
});
