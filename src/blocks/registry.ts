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

class BlocksRegistry extends BaseRegistry<RegistryId, IBlock> {
  constructor() {
    super(["block", "component", "effect", "reader"], fromJS);

    this.addListener({
      onCacheChanged: () => {
        this.typeCachePromise = null;
      },
    });
  }

  // Write as single promise vs. promise + cache to avoid race conditions in invalidation logic
  private typeCachePromise: Promise<TypedBlockMap> = null;

  /**
   * Infer the type of all blocks in the registry. Uses the brick cache if available.
   * @private
   */
  private async inferAllTypes(): Promise<TypedBlockMap> {
    const typeCache: TypedBlockMap = new Map();

    const items = this.isCachedInitialized ? this.cached() : await this.all();

    console.debug("Computing block types for %d block(s)", items.length);

    const typePromises = await Promise.allSettled(
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

    const failureCount = typePromises.filter(
      (x) => x.status === "rejected"
    ).length;
    if (failureCount > 0) {
      console.warn("Failed to compute type for %d block(s)", failureCount);
    }

    return typeCache;
  }

  /**
   * Return Map for block by RegistryId with computed/inferred metadata.
   * @see cached
   */
  // eslint-disable-next-line @typescript-eslint/promise-function-async -- async returns different promise ids
  allTyped(): Promise<TypedBlockMap> {
    if (this.typeCachePromise == null) {
      const promise = this.inferAllTypes();
      this.typeCachePromise = promise;
      return promise;
    }

    return this.typeCachePromise;
  }
}

const registry = new BlocksRegistry();

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
