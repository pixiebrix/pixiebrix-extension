/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { BlocksRegistry } from "@/blocks/registry";
import { blockFactory } from "@/testUtils/factories";

describe("blocksMap", () => {
  let registry: BlocksRegistry;

  const createReaderBlock = () => blockFactory({ read: jest.fn() } as any);

  beforeEach(() => {
    registry = new BlocksRegistry();
  });

  test("can add and reed a block", async () => {
    const block = createReaderBlock();
    registry.register(block);
    const enrichedBlocks = await registry.allTyped();

    const enrichedBlock = enrichedBlocks.get(block.id);

    expect(enrichedBlock.type).toBe("reader");
    expect(enrichedBlock.block).toBe(block);
  });

  test("returns blocks of multiple registrations", async () => {
    const block1 = createReaderBlock();
    const block2 = createReaderBlock();

    registry.register(block1);
    registry.register(block2);
    const enrichedBlocks = await registry.allTyped();

    expect(enrichedBlocks.get(block1.id).type).toBe("reader");
    expect(enrichedBlocks.get(block1.id).block).toBe(block1);

    expect(enrichedBlocks.get(block2.id).type).toBe("reader");
    expect(enrichedBlocks.get(block2.id).block).toBe(block2);
  });
});
