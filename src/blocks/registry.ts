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

class BlocksRegistry extends BaseRegistry<RegistryId, IBlock> {
  private readonly blocksMap = new Map<RegistryId, TypedBlock>();

  async allTyped(): Promise<BlocksMap> {
    // ToDo await for all types to get resolved
    const blocksMap: BlocksMap = {};
    const blocks = this.cached();
    for (const block of blocks) {
      blocksMap[block.id] = {
        block,
        // eslint-disable-next-line no-await-in-loop
        type: await getType(block),
      };
    }

    return blocksMap;
  }

  register(...items: IBlock[]): void {
    super.register(...items);

    for (const item of items) {
      void getType(item).then((itemType) => {
        this.blocksMap.set(item.id, {
          block: item,
          type: itemType,
        });
      });
    }
  }

  clear() {
    super.clear();

    this.blocksMap.clear();
  }
}

const registry = new BlocksRegistry(
  ["block", "component", "effect", "reader"],
  "blocks",
  fromJS
);

export function registerBlock(block: IBlock): void {
  registry.register(block);
}

export default registry;
