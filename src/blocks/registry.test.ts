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

import blocksRegistry from "@/blocks/registry";
import {
  blockFactory,
  extensionPointDefinitionFactory,
} from "@/testUtils/factories";
import { registry as backgroundRegistry } from "@/background/messenger/api";
import { echoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { parsePackage } from "@/registry/localRegistry";

const getByKindsMock = backgroundRegistry.getByKinds as jest.MockedFunction<
  typeof backgroundRegistry.getByKinds
>;
const findMock = backgroundRegistry.find as jest.MockedFunction<
  typeof backgroundRegistry.find
>;

beforeEach(() => {
  jest.resetAllMocks();
  getByKindsMock.mockResolvedValue([]);
  blocksRegistry.clear();
});

describe("blocksMap", () => {
  afterEach(() => {
    // eslint-disable-next-line new-cap -- test-only method
    blocksRegistry.TEST_reset();
  });

  const createReaderBlock = () => blockFactory({ read: jest.fn() } as any);

  test("can add and read a block", async () => {
    const block = createReaderBlock();
    blocksRegistry.register([block]);
    const enrichedBlocks = await blocksRegistry.allTyped();

    const enrichedBlock = enrichedBlocks.get(block.id);

    expect(enrichedBlock.type).toBe("reader");
    expect(enrichedBlock.block).toBe(block);
  });

  test("returns blocks of multiple registrations", async () => {
    const block1 = createReaderBlock();
    const block2 = createReaderBlock();

    blocksRegistry.register([block1, block2]);
    const enrichedBlocks = await blocksRegistry.allTyped();

    expect(enrichedBlocks.get(block1.id).type).toBe("reader");
    expect(enrichedBlocks.get(block1.id).block).toBe(block1);

    expect(enrichedBlocks.get(block2.id).type).toBe("reader");
    expect(enrichedBlocks.get(block2.id).block).toBe(block2);
  });

  test("caches the typed blocks", async () => {
    getByKindsMock.mockResolvedValueOnce([
      {
        ...parsePackage(extensionPointDefinitionFactory() as any),
        timestamp: new Date(),
      },
      {
        ...parsePackage(extensionPointDefinitionFactory() as any),
        timestamp: new Date(),
      },
    ]);

    jest.spyOn(blocksRegistry, "all");

    // First call loads the blocks
    let blocks = await blocksRegistry.allTyped();

    expect(blocksRegistry.all).toHaveBeenCalledTimes(1);
    expect(blocks.size).toBe(2);

    // Second call uses the cache
    blocks = await blocksRegistry.allTyped();

    expect(blocksRegistry.all).toHaveBeenCalledTimes(1);
    expect(blocks.size).toBe(2);
  });
});

describe("blocksRegistry", () => {
  afterEach(() => {
    // eslint-disable-next-line new-cap -- test-only method
    blocksRegistry.TEST_reset();
  });

  test("reads single JS block", async () => {
    blocksRegistry.register([echoBlock]);
    await expect(blocksRegistry.all()).resolves.toEqual([echoBlock]);
    expect(blocksRegistry.cached()).toEqual([echoBlock]);
  });

  test("preserves JS block on clear", async () => {
    blocksRegistry.register([echoBlock]);
    blocksRegistry.clear();
    await expect(blocksRegistry.all()).resolves.toEqual([echoBlock]);
    expect(blocksRegistry.cached()).toEqual([echoBlock]);

    blocksRegistry.clear();
    await expect(blocksRegistry.lookup(echoBlock.id)).resolves.toEqual(
      echoBlock
    );
  });

  test("throws on invalid cache", async () => {
    blocksRegistry.register([echoBlock]);
    blocksRegistry.clear();
    expect(blocksRegistry.isCachedInitialized).toBe(false);
    expect(() => blocksRegistry.cached()).toThrow("Cache not initialized");
  });

  test("cache invalid until all()", async () => {
    const value = extensionPointDefinitionFactory();
    const brick = { ...parsePackage(value as any), timestamp: new Date() };

    getByKindsMock.mockResolvedValueOnce([brick]);
    findMock.mockResolvedValue(brick);

    blocksRegistry.register([echoBlock]);

    await expect(
      blocksRegistry.lookup(value.metadata.id)
    ).resolves.not.toThrow();

    expect(blocksRegistry.isCachedInitialized).toBe(false);

    await blocksRegistry.allTyped();
    expect(blocksRegistry.isCachedInitialized).toBe(true);
  });
});
