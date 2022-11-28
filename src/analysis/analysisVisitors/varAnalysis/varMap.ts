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

import { cloneDeep, get, set, setWith, toPath } from "lodash";

export enum VarExistence {
  MAYBE = "MAYBE",
  DEFINITELY = "DEFINITELY",
}

const META_SYMBOL = Symbol("META");
type Meta = {
  source: string;
};

export const SELF_EXISTENCE = Symbol("SELF_EXISTENCE");
export const ALLOW_ANY_CHILD = Symbol("ALLOW_ANY_CHILD");
type ExistenceMap = {
  [META_SYMBOL]?: Meta;
  [SELF_EXISTENCE]?: VarExistence;
  [ALLOW_ANY_CHILD]?: boolean;

  [name: string]: ExistenceMap;
};

class VarMap {
  private map: ExistenceMap = {};

  /**
   * Sets the existence of variables in the VarMap based on an object with assigned variables.
   * For every property of the Obj a variable existence will be set to DEFINITELY.
   * Ex. { @foo: "bar" } -> { @foo: "DEFINITELY" }
   * @param obj A context object with assigned variables
   * @param parentPath Path to the object in the VarMap
   */
  setExistenceFromObj(obj: Record<string, unknown>, parentPath = ""): void {
    if (parentPath !== "" && !parentPath.endsWith(".")) {
      parentPath += ".";
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object") {
        this.setExistenceFromObj(
          value as Record<string, unknown>,
          `${parentPath}${key}.`
        );
      } else {
        this.setExistence(`${parentPath}${key}`, VarExistence.DEFINITELY);
      }
    }
  }

  setExistence(
    path: string,
    existence: VarExistence,
    allowAnyChild = false
  ): void {
    const pathParts = toPath(path);
    const selfExistencePathParts = [...pathParts, SELF_EXISTENCE];
    const exactExistence = get(this.map, selfExistencePathParts);

    // Not overwriting DEFINITELY existing var
    if (exactExistence !== VarExistence.DEFINITELY) {
      setWith(this.map, selfExistencePathParts, existence, (x) =>
        x == null
          ? {
              [SELF_EXISTENCE]: existence,
            }
          : x
      );
    }

    if (allowAnyChild) {
      set(this.map, [...pathParts, ALLOW_ANY_CHILD], true);
    }
  }

  getExistence(path: string): VarExistence | undefined {
    const exactExistence = get(this.map, path)?.[SELF_EXISTENCE];
    if (typeof exactExistence === "string") {
      return exactExistence;
    }

    const pathParts = toPath(path);
    if (pathParts.length === 1) {
      return undefined;
    }

    let bag = this.map;
    while (pathParts.length > 0) {
      if (bag[ALLOW_ANY_CHILD]) {
        return VarExistence.MAYBE;
      }

      const part = pathParts.shift();
      bag = bag[part];
      if (bag == null) {
        return undefined;
      }
    }

    return undefined;
  }

  setSource(path: string, source: string): void {
    set(this.map, [...toPath(path), META_SYMBOL, "source"], source);
  }

  getMeta(path: string): Meta | undefined {
    const existence = get(this.map, path);
    return existence?.[META_SYMBOL];
  }

  clone(): VarMap {
    const clone = new VarMap();
    clone.map = cloneDeep(this.map);
    return clone;
  }

  merge(other: VarMap): VarMap {
    const mergedMap = mergeExistenceMaps(this.map, other.map);
    const merged = new VarMap();
    merged.map = mergedMap;

    return merged;
  }
}

export function mergeExistenceMaps(
  a: ExistenceMap,
  b: ExistenceMap
): ExistenceMap {
  const merged = {} as ExistenceMap;
  merger(merged, a);
  merger(merged, b);
  return merged;

  function merger(target: ExistenceMap, source: ExistenceMap) {
    if (source == null) {
      return;
    }

    if (
      target[SELF_EXISTENCE] !== VarExistence.DEFINITELY &&
      typeof source[SELF_EXISTENCE] === "string"
    ) {
      target[SELF_EXISTENCE] = source[SELF_EXISTENCE];
    }

    if (source[ALLOW_ANY_CHILD]) {
      target[ALLOW_ANY_CHILD] = true;
    }

    if (source[META_SYMBOL]) {
      target[META_SYMBOL] = source[META_SYMBOL];
    }

    for (const [key, value] of Object.entries(source)) {
      if (typeof target[key] !== "object") {
        target[key] = {};
      }

      merger(target[key], value);
    }
  }
}

export default VarMap;
