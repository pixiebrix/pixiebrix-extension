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
import { blockFactory, extensionFactory } from "@/testUtils/factories";
import { registry as backgroundRegistry } from "@/background/messenger/api";
import { echoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";

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
    (backgroundRegistry.getByKinds as jest.Mock).mockResolvedValueOnce([
      extensionFactory(),
      extensionFactory(),
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

  test("reads single block", async () => {
    blocksRegistry.register([echoBlock]);
    await expect(blocksRegistry.all()).resolves.toEqual([echoBlock]);
    expect(blocksRegistry.cached()).toEqual([echoBlock]);
  });

  test("preserves built-in block on clear", async () => {
    blocksRegistry.register([echoBlock]);
    blocksRegistry.clear();
    await expect(blocksRegistry.all()).resolves.toEqual([echoBlock]);
    expect(blocksRegistry.cached()).toEqual([echoBlock]);

    blocksRegistry.clear();
    await expect(blocksRegistry.lookup(echoBlock.id)).resolves.toEqual(
      echoBlock
    );
  });
});
