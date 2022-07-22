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

import BaseRegistry from "@/baseRegistry";
import { fromJS } from "@/blocks/transformers/blockFactory";
import { IBlock, RegistryId } from "@/core";
import { BlockType, ResolvedBlockConfig } from "@/runtime/runtimeTypes";
import getType from "@/runtime/getType";
import { BlockConfig } from "@/blocks/types";

/**
 * A block along with inferred/calculated information
 */
export type TypedBlock = {
  block: IBlock;
  type: BlockType;
};

export type TypedBlockMap = Map<RegistryId, TypedBlock>;

export class BlocksRegistry extends BaseRegistry<RegistryId, IBlock> {
  constructor() {
    super(["block", "component", "effect", "reader"], "blocks", fromJS);
  }

  // Write as single promise vs. promise + cache to avoid race conditions in invalidation logic
  private typeCachePromise: Promise<TypedBlockMap> = null;

  private async inferAllTypes(): Promise<TypedBlockMap> {
    const typeCache: TypedBlockMap = new Map();
    const items = await this.all();

    console.debug("Computing block types for %d block(s)", items.length);

    await Promise.all(
      items.map(async (item) => {
        // XXX: will we run into problems with circular dependency between getType and the registry exported from
        //  this module? getType references the blockRegistry in order to calculate the type for composite bricks
        //  that are defined as a pipeline of other blocks.
        typeCache.set(item.id, {
          block: item,
          type: await getType(item),
        });
      })
    );

    return typeCache;
  }

  /**
   * Return Map for block by RegistryId with computed/inferred metadata.
   * @see all
   */
  async allTyped(): Promise<TypedBlockMap> {
    if (this.typeCachePromise == null) {
      const promise = this.inferAllTypes();
      this.typeCachePromise = promise;
      return promise;
    }

    return this.typeCachePromise;
  }

  async lookupTyped(id: RegistryId): Promise<TypedBlock> {
    const typeCache = await this.allTyped();
    return typeCache.get(id);
  }

  override register(...items: IBlock[]): void {
    super.register(...items);
    this.typeCachePromise = null;
  }

  override clear() {
    super.clear();
    this.typeCachePromise = null;
  }
}

const registry = new BlocksRegistry();

export function registerBlock(block: IBlock): void {
  registry.register(block);
}

export default registry;

export async function resolveBlockConfig(
  config: BlockConfig
): Promise<ResolvedBlockConfig> {
  const block = await registry.lookup(config.id);
  return {
    config,
    block,
    type: await getType(block),
  };
}
