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

import { cloneDeep, get, set, setWith, toPath } from "lodash";

type SetExistenceArgs = {
  /**
   * The source for the VarMap (e.g. "input:reader", "trace", or block path in the pipeline)
   */
  source: string;

  /**
   * The path of the variable.
   * String value will be converted to a property path array using lodash's toPath function.
   */
  path: string | string[];

  /**
   * Existence of the variable
   */
  existence: VarExistence;

  /**
   * True if the output key can have any child, i.e. the output schema is unknown
   */
  allowAnyChild?: boolean;

  isArray?: boolean;
};

type SetOutputKeyExistenceArgs = {
  /**
   * The source for the VarMap (e.g. "input:reader", "trace", or block path in the pipeline)
   */
  source: string;

  /**
   * The output key of the block
   */
  outputKey: string;

  /**
   * Existence of the variable
   */
  existence: VarExistence;

  /**
   * True if the output key can have any child, i.e. the output schema is unknown
   */
  allowAnyChild: boolean;
};

type SetExistenceFromValuesArgs = {
  /**
   * The source for the VarMap (e.g. "input:reader", "trace", or block path in the pipeline)
   */
  source: string;

  /**
   * The object containing the context values
   */
  values: Record<string, unknown>;

  /**
   * Parent path for the values.
   * For instance, a page reader context gets a parent path of "@input"
   */
  parentPath?: string;
};

export enum VarExistence {
  MAYBE = "MAYBE",
  DEFINITELY = "DEFINITELY",
}

// This symbols are used to define the own properties of the existence tree node
export const SELF_EXISTENCE = Symbol("SELF_EXISTENCE");
export const ALLOW_ANY_CHILD = Symbol("ALLOW_ANY_CHILD");
export const IS_ARRAY = Symbol("IS_ARRAY");
export type ExistenceNode = {
  /**
   * Existence of the current node
   */
  [SELF_EXISTENCE]?: VarExistence;

  /**
   * Whether the current node allows any child (i.e. doesn't have  a strict schema)
   */
  [ALLOW_ANY_CHILD]?: boolean;

  /**
   * Whether the current node is an array (allows only numeric keys)
   */
  [IS_ARRAY]?: boolean;

  [name: string]: ExistenceNode;
};

type CreateNodeOptions = {
  allowAnyChild?: boolean;
  isArray?: boolean;
};

/**
 * Creates an new node for the existence map
 * @param selfExistence Existence of the current node
 * @param allowAnyChild Whether the current node allows any child (i.e. doesn't have  a strict schema)
 */
export function createNode(
  selfExistence: VarExistence,
  { allowAnyChild = false, isArray = false }: CreateNodeOptions = {}
): ExistenceNode {
  const node: ExistenceNode = {
    [SELF_EXISTENCE]: selfExistence,
    [ALLOW_ANY_CHILD]: allowAnyChild,
    [IS_ARRAY]: isArray,
  };

  return node;
}

const numberReges = /^\d+$/;

class VarMap {
  private map: Record<string, ExistenceNode> = {};

  /**
   * Returns the internal existence map (deep cloned, so it's safe to modify)
   */
  public getMap(): Record<string, ExistenceNode> {
    return cloneDeep(this.map);
  }

  /**
   * Sets the existence of a variable by path
   */
  public setExistence({
    source,
    path,
    existence,
    allowAnyChild = false,
    isArray = false,
  }: SetExistenceArgs): void {
    const pathParts = [source, ...(Array.isArray(path) ? path : toPath(path))];
    const currentExistence = get(this.map, [...pathParts, SELF_EXISTENCE]);

    // Don't overwrite a DEFINITELY existence with a MAYBE existence
    if (
      currentExistence != null &&
      (currentExistence === existence ||
        currentExistence === VarExistence.DEFINITELY)
    ) {
      return;
    }

    setWith(
      this.map,
      [...pathParts, SELF_EXISTENCE],
      existence,
      (currentNode) => {
        if (currentNode == null) {
          return createNode(existence);
        }

        if (
          existence === VarExistence.DEFINITELY &&
          // eslint-disable-next-line security/detect-object-injection -- accessing a known property
          currentNode[SELF_EXISTENCE] !== VarExistence.DEFINITELY
        ) {
          // eslint-disable-next-line security/detect-object-injection -- accessing a known property
          currentNode[SELF_EXISTENCE] = VarExistence.DEFINITELY;
        }

        return currentNode;
      }
    );

    if (allowAnyChild) {
      set(this.map, [...pathParts, ALLOW_ANY_CHILD], true);
    }

    if (isArray) {
      set(this.map, [...pathParts, IS_ARRAY], true);
    }
  }

  /**
   * Converts an object containing variables to a var existence map. Each node gets a DEFINITELY existence. Ex. converting trace output to an existence map
   */
  public setExistenceFromValues({
    source,
    values,
    parentPath = "",
  }: SetExistenceFromValuesArgs): void {
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "object") {
        this.setExistenceFromValues({
          source,
          values: value as Record<string, unknown>,
          parentPath: parentPath === "" ? key : `${parentPath}.${key}`,
        });
      } else {
        setWith(
          this.map,
          [source, ...toPath(parentPath), key, SELF_EXISTENCE],
          VarExistence.DEFINITELY,
          (x) => x ?? createNode(VarExistence.DEFINITELY)
        );
      }
    }
  }

  /**
   * Adds an existence for a block with output key
   */
  public setOutputKeyExistence({
    source,
    outputKey,
    existence,
    allowAnyChild,
  }: SetOutputKeyExistenceArgs): void {
    // While any block can provide no more than one output key,
    // we are safe to create a new object for the 'source'
    this.map[source] = {
      [outputKey]: createNode(existence, { allowAnyChild }),
    };
  }

  /**
   * Merges in another VarMap. Overwrites any existing source records
   * @param varMap A VarMap to merge in
   */
  public addSourceMap(varMap: VarMap): void {
    for (const [source, existenceMap] of Object.entries(varMap.map)) {
      this.map[source] = existenceMap;
    }
  }

  /**
   * Checks if a variable is defined
   * @param path The path to check
   * @returns True for a known variable (either DEFINITELY or MAYBE)
   */
  public isVariableDefined(path: string): boolean {
    const pathParts = toPath(path);

    for (const sourceMap of Object.values(this.map).filter(
      // Only check the sources (bricks) that provide the output key (the first part of the path)
      // Usually there is one brick providing the output key and the vars from traces
      (x) => x[pathParts[0]] != null
    )) {
      let bag = sourceMap;
      while (pathParts.length > 0) {
        const part = pathParts.shift();

        // Handle the array case (allow only numeric keys)
        const isNumberPart = numberReges.test(part);
        if (isNumberPart && bag[IS_ARRAY]) {
          // Dealing with array of primitives or array of unknown objects
          if (pathParts.length === 0 || bag[ALLOW_ANY_CHILD]) {
            return true;
          }

          continue;
        }

        bag = bag[part];
        if (bag == null) {
          break;
        }

        // Check if any child is allowed and the current bag is not an array
        if (bag[ALLOW_ANY_CHILD] && !bag[IS_ARRAY]) {
          return true;
        }
      }

      if (bag?.[SELF_EXISTENCE] != null) {
        return true;
      }
    }

    return false;
  }

  /**
   * Clones the VarMap
   * @returns A copy of the VarMap
   */
  clone(): VarMap {
    const clone = new VarMap();
    clone.map = cloneDeep(this.map);
    return clone;
  }
}

export default VarMap;
