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

import { cloneDeep, get, set, toPath } from "lodash";

export enum VarExistence {
  MAYBE = "MAYBE",
  DEFINITELY = "DEFINITELY",
}

type ExistenceMap = {
  "*"?: VarExistence;
  [name: string]: ExistenceMap | VarExistence;
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

  setExistence(path: string, existence: VarExistence): void {
    const current = get(this.map, path);
    // Not overriding objects and DEFINITELY existing vars
    if (typeof current === "object" || current === VarExistence.DEFINITELY) {
      return;
    }

    set(this.map, path, existence);
  }

  getExistence(path: string): VarExistence | undefined {
    const exactExistence = get(this.map, path);
    if (exactExistence !== undefined) {
      return typeof exactExistence === "string"
        ? exactExistence
        : VarExistence.DEFINITELY;
    }

    const pathParts = toPath(path);
    if (pathParts.length === 1) {
      return undefined;
    }

    let bag: ExistenceMap | VarExistence = this.map;
    while (pathParts.length > 0) {
      if (typeof bag["*"] === "string") {
        return bag["*"];
      }

      const part = pathParts.shift();
      bag = bag[part];
      if (typeof bag !== "object") {
        return bag;
      }
    }

    return undefined;
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

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === "object") {
        if (typeof target[key] !== "object") {
          target[key] = {};
        }

        merger(target[key] as ExistenceMap, value);
      } else if (
        typeof target[key] !== "object" &&
        target[key] !== VarExistence.DEFINITELY
      ) {
        target[key] = value;
      }
    }
  }
}

export default VarMap;
