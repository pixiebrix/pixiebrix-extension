/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import MemoryRegistry from "../registry/memoryRegistry";
import { fromJS } from "./transformers/brickFactory";
import { type BrickType } from "../runtime/runtimeTypes";
import getType from "../runtime/getType";
import { DefinitionKinds, type RegistryId } from "@/types/registryTypes";
import { type Brick } from "@/types/brickTypes";
import { partial } from "lodash";
import { allSettled } from "../utils/promiseUtils";

/**
 * A brick along with inferred/calculated information
 */
export type TypedBrickPair = {
  block: Brick;
  type: BrickType | null;
};

export type TypedBrickMap = Map<RegistryId, TypedBrickPair>;

/**
 * In-memory registry of bricks. Includes both user-defined and built-in bricks.
 */
class BrickRegistry extends MemoryRegistry<RegistryId, Brick> {
  constructor() {
    // A reader is a special kind of brick. So we keep them in the same in-memory registry.
    super([DefinitionKinds.BRICK, DefinitionKinds.READER], null);
    // Can't reference "this" before the call to "super"
    this.setDeserialize(partial(fromJS, this));

    this.onChange.add(() => {
      this.typeCachePromise = null;
    });
  }

  // Write as single promise vs. promise + cache to avoid race conditions in invalidation logic
  private typeCachePromise: Promise<TypedBrickMap> | null = null;

  /**
   * Infer the type of all blocks in the registry. Uses the brick cache if available.
   */
  private async inferAllTypes(): Promise<TypedBrickMap> {
    const typeCache = new Map() as TypedBrickMap;

    const items = this.isCachedInitialized ? this.cached : await this.all();

    console.debug("Computing types for %d brick(s)", items.length);

    await allSettled(
      items.map(async (item) => {
        // XXX: will we run into problems with circular dependency between getType and the registry exported from
        //  this module? getType references the brickRegistry in order to calculate the type for composite bricks
        //  that are defined as a pipeline of other blocks.
        typeCache.set(item.id, {
          block: item,
          type: await getType(item),
        });
      }),
      {
        catch(errors) {
          console.warn(`Failed to compute type for ${errors.length} brick`, {
            errors,
          });
        },
      },
    );

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
const registry = new BrickRegistry();

export default registry;
