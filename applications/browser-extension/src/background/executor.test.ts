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

import { requestRunInAllFrames } from "@/background/executor";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { type MessengerMeta } from "webext-messenger";
import { runBrick } from "@/contentScript/messenger/api";
import { type WebNavigation } from "webextension-polyfill";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { define, derive } from "cooky-cutter";
import { type RemoteBrickOptions } from "@/contentScript/messenger/runBrickTypes";
import { messengerMetaFactory } from "@/testUtils/factories/messengerFactories";
import { mapModComponentRefToMessageContext } from "@/utils/modUtils";
import { runMetadataFactory } from "@/testUtils/factories/runtimeFactories";
import { assertNotNullish } from "@/utils/nullishUtils";

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
  meta: runMetadataFactory,
  messageContext: derive<
    RemoteBrickOptions,
    RemoteBrickOptions["messageContext"]
  >((options) => {
    assertNotNullish(
      options.meta,
      "You must provide meta to derive messageContext",
    );
    return mapModComponentRefToMessageContext(options.meta.modComponentRef);
  }, "meta"),
});

beforeEach(() => {
  runBrickMock.mockClear();
  getAllFramesMock.mockClear();
});

describe("requestRunInAllFrames", () => {
  it("run in no frames", async () => {
    // Not really possible because the top-level frame will always be there
    getAllFramesMock.mockResolvedValue([]);

    const meta: MessengerMeta = messengerMetaFactory();

    const promise = requestRunInAllFrames.call(meta, {
      brickId: registryIdFactory(),
      brickArgs: unsafeAssumeValidArg({}),
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

    const meta: MessengerMeta = messengerMetaFactory();

    const promise = requestRunInAllFrames.call(meta, {
      brickId: registryIdFactory(),
      brickArgs: unsafeAssumeValidArg({}),
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

    const meta: MessengerMeta = messengerMetaFactory();

    const promise = requestRunInAllFrames.call(meta, {
      brickId: registryIdFactory(),
      brickArgs: unsafeAssumeValidArg({}),
      options: optionsFactory(),
    });

    await expect(promise).resolves.toStrictEqual([{ foo: 42 }]);
  });
});
