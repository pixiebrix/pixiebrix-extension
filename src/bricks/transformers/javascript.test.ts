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

import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { JavaScriptTransformer } from "@/bricks/transformers/javascript";
import { runUserJs } from "@/sandbox/messenger/api";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";

jest.mock("@/sandbox/messenger/api");

const runUserJsMock = jest.mocked(runUserJs);

const brick = new JavaScriptTransformer();

describe("JavaScriptTransformer", () => {
  beforeEach(() => {
    runUserJsMock.mockReset();
  });

  test("executes the JavaScript function", async () => {
    const value = { function: "function () { return 1 + 1; };" };

    await brick.transform(unsafeAssumeValidArg(value), brickOptionsFactory());

    expect(runUserJsMock).toHaveBeenCalledWith({
      blockId: "@pixiebrix/javascript",
      code: "function () { return 1 + 1; };",
    });
  });

  test("passes arguments to the JavaScript function", async () => {
    const value = {
      function: "function (x) { return x + 1; };",
      arguments: { x: 1 },
    };

    await brick.transform(unsafeAssumeValidArg(value), brickOptionsFactory());

    expect(runUserJsMock).toHaveBeenCalledWith({
      blockId: "@pixiebrix/javascript",
      code: "function (x) { return x + 1; };",
      data: { x: 1 },
    });
  });

  test("errors are propagated", async () => {
    runUserJsMock.mockRejectedValueOnce(new Error("test"));
    const value = { function: "function () { throw new Error('test'); };" };

    await expect(
      brick.transform(unsafeAssumeValidArg(value), brickOptionsFactory()),
    ).rejects.toThrow("test");
  });
});
