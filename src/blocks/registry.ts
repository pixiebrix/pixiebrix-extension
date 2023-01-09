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

import BaseRegistry from "@/baseRegistry";
import { fromJS } from "@/blocks/transformers/blockFactory";
import { type IBlock, type RegistryId } from "@/core";
import {
  type BlockType,
  type ResolvedBlockConfig,
} from "@/runtime/runtimeTypes";
import getType from "@/runtime/getType";
import { type BlockConfig } from "@/blocks/types";

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

  private allBlocksLoaded = false;
  private readonly typeCache: TypedBlockMap = new Map();

  /**
   * Return Map for block by RegistryId with computed/inferred metadata.
   * @see all
   */
  async allTyped(): Promise<TypedBlockMap> {
    console.log("BlocksRegistry.allTyped");
    if (this.allBlocksLoaded) {
      console.log("BlocksRegistry. returning cached value");
      return this.typeCache;
    }

    console.log("BlocksRegistry. loading all blocks");

    // No need to loadTypes from this method.
    // this.all() will load blocks and register each block
    // this.register() loads types
    await this.all();

    this.allBlocksLoaded = true;
    return this.typeCache;
  }

  private async loadTypes(items: IBlock[]): Promise<void> {
    await Promise.all(
      items.map(async (item) => {
        // XXX: will we run into problems with circular dependency between getType and the registry exported from
        //  this module? getType references the blockRegistry in order to calculate the type for composite bricks
        //  that are defined as a pipeline of other blocks.
        this.typeCache.set(item.id, {
          block: item,
          type: await getType(item),
        });
      })
    );
  }

  override register(...items: IBlock[]): void {
    super.register(...items);
    void this.loadTypes(items);
  }

  override clear() {
    super.clear();
    this.typeCache.clear();
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
