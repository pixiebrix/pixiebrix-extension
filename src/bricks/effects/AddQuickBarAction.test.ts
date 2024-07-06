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

import AddQuickBarAction from "@/bricks/effects/AddQuickBarAction";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { platformMock } from "@/testUtils/platformMock";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";

const brick = new AddQuickBarAction();

const platform = platformMock;

describe("AddQuickBarAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("is root aware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  test("is not pure", async () => {
    await expect(brick.isPure()).resolves.toBe(false);
  });

  test("adds root action", async () => {
    const abortController = new AbortController();

    const modComponentRef = modComponentRefFactory();

    await brick.run(
      unsafeAssumeValidArg({ title: "test" }),
      brickOptionsFactory({
        platform,
        logger: new ConsoleLogger(modComponentRef),
        abortSignal: abortController.signal,
      }),
    );

    expect(platform.quickBar.addAction).toHaveBeenCalledWith({
      id: expect.toBeString(),
      modComponentRef,
      name: "test",
      icon: expect.anything(),
      perform: expect.toBeFunction(),
      section: undefined,
      subtitle: undefined,
      priority: 1,
    });
  });
});
