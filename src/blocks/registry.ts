/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { BlockType, getType } from "@/blocks/util";

export type BlocksMap = Record<RegistryId, TypedBlock>;

export type TypedBlock = {
  block: IBlock;
  type: BlockType;
};

export class BlocksRegistry extends BaseRegistry<RegistryId, IBlock> {
  constructor() {
    super(["block", "component", "effect", "reader"], "blocks", fromJS);
  }

  private blocksMap = {};
  private typesPromise: Promise<void> = Promise.resolve();

  async allTyped(): Promise<BlocksMap> {
    await this.typesPromise;
    return this.blocksMap;
  }

  register(...items: IBlock[]): void {
    super.register(...items);

    // Generating promise for the new chunk of items
    const nextTypesPromise: Promise<void> = Promise.all(
      items.map(async (item) =>
        getType(item).then((itemType) => {
          this.blocksMap[item.id] = {
            block: item,
            type: itemType,
          } as TypedBlock;
        })
      )
    ) as any;

    this.typesPromise = this.typesPromise.then(async () => nextTypesPromise);
  }

  clear() {
    super.clear();

    this.blocksMap = {};
    this.typesPromise = Promise.resolve();
  }
}

const registry = new BlocksRegistry();

export function registerBlock(block: IBlock): void {
  registry.register(block);
}

export default registry;
