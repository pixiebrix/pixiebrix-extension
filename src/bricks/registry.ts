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

// eslint-disable-next-line no-restricted-imports
import MemoryRegistry from "../registry/memoryRegistry";
import { fromJS } from "@/bricks/transformers/brickFactory";
import { type BrickType } from "@/runtime/runtimeTypes";
import getType from "@/runtime/getType";
import { type RegistryId } from "@/types/registryTypes";
import { type Brick } from "@/types/brickTypes";
import { partial } from "lodash";

/**
 * A brick along with inferred/calculated information
 */
export type TypedBrickPair = {
  block: Brick;
  type: BrickType;
};

export type TypedBrickMap = Map<RegistryId, TypedBrickPair>;

/**
 * In-memory registry of bricks. Includes both user-defined and built-in bricks.
 */
class BrickRegistry extends MemoryRegistry<RegistryId, Brick> {
  constructor() {
    super(["block", "component", "effect", "reader"], null);
    // Can't reference "this" before the call to "super"
    this.setDeserialize(partial(fromJS, this));

    this.addListener({
      onCacheChanged: () => {
        this.typeCachePromise = null;
      },
    });
  }

  // Write as single promise vs. promise + cache to avoid race conditions in invalidation logic
  private typeCachePromise: Promise<TypedBrickMap> = null;

  /**
   * Infer the type of all blocks in the registry. Uses the brick cache if available.
   * @private
   */
  private async inferAllTypes(): Promise<TypedBrickMap> {
    const typeCache: TypedBrickMap = new Map();

    const items = this.isCachedInitialized ? this.cached : await this.all();

    console.debug("Computing block types for %d block(s)", items.length);

    const typePromises = await Promise.allSettled(
      items.map(async (item) => {
        // XXX: will we run into problems with circular dependency between getType and the registry exported from
        //  this module? getType references the brickRegistry in order to calculate the type for composite bricks
        //  that are defined as a pipeline of other blocks.
        typeCache.set(item.id, {
          block: item,
          type: await getType(item),
        });
      }),
    );

    const failureCount = typePromises.filter(
      (x) => x.status === "rejected",
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
  allTyped(): Promise<TypedBrickMap> {
    if (this.typeCachePromise == null) {
      const promise = this.inferAllTypes();
      this.typeCachePromise = promise;
      return promise;
    }

    return this.typeCachePromise;
  }
}

/**
 * The singleton brick registry instance
 * @see initRuntime
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const registry = new BrickRegistry();

export default registry;
