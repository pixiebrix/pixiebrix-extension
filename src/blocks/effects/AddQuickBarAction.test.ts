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

import AddQuickBarAction from "@/blocks/effects/AddQuickBarAction";
import quickbarRegistry from "@/components/quickBar/quickBarRegistry";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4, validateRegistryId } from "@/types/helpers";

const brick = new AddQuickBarAction();

jest.mock("@/components/quickBar/quickBarRegistry", () => ({
  __esModule: true,
  default: {
    addAction: jest.fn(),
    knownGeneratorRootIds: new Set<string>(),
  },
}));

const addActionMock = quickbarRegistry.addAction as jest.Mock;

const logger = new ConsoleLogger({
  extensionId: uuidv4(),
  extensionPointId: validateRegistryId("test/test"),
});

describe("AddQuickBarAction", () => {
  beforeEach(() => {
    addActionMock.mockReset();
  });

  test("is root aware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  test("is not pure", async () => {
    await expect(brick.isPure()).resolves.toBe(false);
  });

  test("adds root action", async () => {
    const abortController = new AbortController();

    await brick.run(unsafeAssumeValidArg({ title: "test" }), {
      logger,
      root: document,
      abortSignal: abortController.signal,
    } as any);
    expect(addActionMock).toHaveBeenCalledWith({
      id: expect.toBeString(),
      extensionPointId: logger.context.extensionPointId,
      extensionId: logger.context.extensionId,
      name: "test",
      icon: expect.anything(),
      perform: expect.toBeFunction(),
      section: undefined,
      subtitle: undefined,
      priority: 1,
    });
  });
});
