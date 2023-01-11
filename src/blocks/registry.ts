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

import BaseRegistry, { type RegistryChangeListener } from "@/baseRegistry";
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

type BlockRegistryChangeListener = RegistryChangeListener & {
  onTypedCacheChanged?: () => void;
};

export type TypedBlockMap = Map<RegistryId, TypedBlock>;

export class BlocksRegistry extends BaseRegistry<
  RegistryId,
  IBlock,
  BlockRegistryChangeListener
> {
  constructor() {
    super(["block", "component", "effect", "reader"], "blocks", fromJS);
  }

  private loadingBlockTypePromises: Array<Promise<void>> = [];
  private loadAllPromise: Promise<IBlock[]>;
  private readonly typeCache: TypedBlockMap = new Map();

  private loadTypes(items: IBlock[]) {
    this.loadingBlockTypePromises.push(
      ...items.map(async (item) => {
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

  private emitAllTypedChange() {
    for (const listener of this.listeners.filter(
      (x) => x.onTypedCacheChanged
    )) {
      listener.onCacheChanged();
    }
  }

  allTypedSnapshot = (): TypedBlockMap => this.typeCache;

  subscribeToAllTyped = (listener: () => void): (() => void) => {
    const registryListener: BlockRegistryChangeListener = {
      onTypedCacheChanged: listener,
    };

    this.addListener(registryListener);

    return () => {
      this.removeListener(registryListener);
    };
  };

  /**
   * Return Map for block by RegistryId with computed/inferred metadata.
   * @see all
   */
  async allTyped(): Promise<TypedBlockMap> {
    // Load all blocks if not already loaded
    if (this.loadAllPromise == null) {
      console.debug("Resolving types for all known blocks");

      void this.all();
      const typedBlocks = await this.allTyped();

      this.emitAllTypedChange();
      return typedBlocks;
    }

    // Wait for all blocks to be loaded
    await this.loadAllPromise;

    if (this.loadingBlockTypePromises.length === 0) {
      return new Map(this.typeCache);
    }

    // Wait for all block types to be loaded (see this.register)
    const loadingBlockTypes = this.loadingBlockTypePromises;
    this.loadingBlockTypePromises = [];

    await Promise.all(loadingBlockTypes);

    return new Map(this.typeCache);
  }

  override async all(): Promise<IBlock[]> {
    console.debug("Loading all blocks from registry");

    this.loadAllPromise = super.all();
    return this.loadAllPromise;
  }

  override register(...items: IBlock[]): void {
    super.register(...items);
    this.loadTypes(items);
  }

  override clear() {
    super.clear();
    this.typeCache.clear();
    this.loadAllPromise = null;
    this.loadingBlockTypePromises = [];
    this.emitAllTypedChange();
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
