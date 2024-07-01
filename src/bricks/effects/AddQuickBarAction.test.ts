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
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { platformMock } from "@/testUtils/platformMock";

const brick = new AddQuickBarAction();

const platform = platformMock;

const logger = new ConsoleLogger({
  modComponentId: uuidv4(),
  starterBrickId: validateRegistryId("test/test"),
});

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

    await brick.run(
      unsafeAssumeValidArg({ title: "test" }),
      brickOptionsFactory({
        platform,
        logger,
        root: document,
        abortSignal: abortController.signal,
      }),
    );
    expect(platform.quickBar.addAction).toHaveBeenCalledWith({
      id: expect.toBeString(),
      extensionPointId: logger.context.starterBrickId,
      extensionId: logger.context.modComponentId,
      name: "test",
      icon: expect.anything(),
      perform: expect.toBeFunction(),
      section: undefined,
      subtitle: undefined,
      priority: 1,
    });
  });
});
