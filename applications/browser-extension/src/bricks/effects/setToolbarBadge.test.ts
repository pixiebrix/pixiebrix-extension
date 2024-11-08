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

import SetToolbarBadge from "@/bricks/effects/setToolbarBadge";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import { setToolbarBadge } from "@/background/messenger/api";

const brick = new SetToolbarBadge();
jest.mock("@/utils/iframeUtils", () => ({
  isLoadedInIframe: jest.fn(() => false),
}));

describe("SetToolbarBadge", () => {
  it("runs without error", async () => {
    const expectedText = "test";
    const options = brickOptionsFactory();
    await expect(
      brick.run(unsafeAssumeValidArg({ text: expectedText }), options),
    ).resolves.not.toThrow();

    expect(setToolbarBadge).toHaveBeenCalledWith(expectedText, {
      modComponentRef: options.meta.modComponentRef,
    });
  });

  it("throws a BusinessError if run in an iframe", async () => {
    jest.mocked(isLoadedInIframe).mockReturnValueOnce(true);
    await expect(
      brick.run(unsafeAssumeValidArg({ text: "test" }), brickOptionsFactory()),
    ).rejects.toThrow("Cannot set toolbar badge from an iframe.");
  });
});
