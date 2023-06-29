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

import bricksRegistry from "@/blocks/registry";
import { registry as backgroundRegistry } from "@/background/messenger/api";
import { echoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { parsePackage } from "@/registry/localRegistry";
import { extensionPointDefinitionFactory } from "@/testUtils/factories/recipeFactories";
import { brickFactory } from "@/testUtils/factories/brickFactories";

const getByKindsMock = backgroundRegistry.getByKinds as jest.MockedFunction<
  typeof backgroundRegistry.getByKinds
>;
const findMock = backgroundRegistry.find as jest.MockedFunction<
  typeof backgroundRegistry.find
>;

beforeEach(() => {
  jest.resetAllMocks();
  getByKindsMock.mockResolvedValue([]);
  bricksRegistry.clear();
});

describe("blocksMap", () => {
  afterEach(() => {
    // eslint-disable-next-line new-cap -- test-only method
    bricksRegistry.TEST_reset();
  });

  const createReaderBlock = () => brickFactory({ read: jest.fn() } as unknown);

  test("can add and read a block", async () => {
    const block = createReaderBlock();
    bricksRegistry.register([block]);
    const enrichedBlocks = await bricksRegistry.allTyped();

    const enrichedBlock = enrichedBlocks.get(block.id);

    expect(enrichedBlock.type).toBe("reader");
    expect(enrichedBlock.block).toBe(block);
  });

  test("returns blocks of multiple registrations", async () => {
    const block1 = createReaderBlock();
    const block2 = createReaderBlock();

    bricksRegistry.register([block1, block2]);
    const enrichedBlocks = await bricksRegistry.allTyped();

    expect(enrichedBlocks.get(block1.id).type).toBe("reader");
    expect(enrichedBlocks.get(block1.id).block).toBe(block1);

    expect(enrichedBlocks.get(block2.id).type).toBe("reader");
    expect(enrichedBlocks.get(block2.id).block).toBe(block2);
  });

  test("caches the typed blocks", async () => {
    getByKindsMock.mockResolvedValueOnce([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ...parsePackage(extensionPointDefinitionFactory() as any),
        timestamp: new Date(),
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ...parsePackage(extensionPointDefinitionFactory() as any),
        timestamp: new Date(),
      },
    ]);

    jest.spyOn(bricksRegistry, "all");

    // First call loads the blocks
    let blocks = await bricksRegistry.allTyped();

    expect(bricksRegistry.all).toHaveBeenCalledTimes(1);
    expect(blocks.size).toBe(2);

    // Second call uses the cache
    blocks = await bricksRegistry.allTyped();

    expect(bricksRegistry.all).toHaveBeenCalledTimes(1);
    expect(blocks.size).toBe(2);
  });
});

describe("bricksRegistry", () => {
  afterEach(() => {
    // eslint-disable-next-line new-cap -- test-only method
    bricksRegistry.TEST_reset();
  });

  test("reads single JS block", async () => {
    bricksRegistry.register([echoBlock]);
    await expect(bricksRegistry.all()).resolves.toEqual([echoBlock]);
    expect(bricksRegistry.cached).toEqual([echoBlock]);
  });

  test("preserves JS block on clear", async () => {
    bricksRegistry.register([echoBlock]);
    bricksRegistry.clear();
    await expect(bricksRegistry.all()).resolves.toEqual([echoBlock]);
    expect(bricksRegistry.cached).toEqual([echoBlock]);

    bricksRegistry.clear();
    await expect(bricksRegistry.lookup(echoBlock.id)).resolves.toEqual(
      echoBlock
    );
  });

  test("throws on invalid cache", async () => {
    bricksRegistry.register([echoBlock]);
    bricksRegistry.clear();
    expect(bricksRegistry.isCachedInitialized).toBe(false);
    expect(() => bricksRegistry.cached).toThrow("Cache not initialized");
  });

  test("cache invalid until all()", async () => {
    const value = extensionPointDefinitionFactory();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const brick = { ...parsePackage(value as any), timestamp: new Date() };

    getByKindsMock.mockResolvedValueOnce([brick]);
    findMock.mockResolvedValue(brick);

    bricksRegistry.register([echoBlock]);

    await expect(
      bricksRegistry.lookup(value.metadata.id)
    ).resolves.not.toThrow();

    expect(bricksRegistry.isCachedInitialized).toBe(false);

    await bricksRegistry.allTyped();
    expect(bricksRegistry.isCachedInitialized).toBe(true);
  });
});
