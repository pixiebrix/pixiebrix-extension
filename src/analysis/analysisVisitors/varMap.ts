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

import { cloneDeep, get, merge, set } from "lodash";

export enum VarExistence {
  MAYBE = "MAYBE",
  DEFINITELY = "DEFINITELY",
}

type VarObj = {
  "*"?: VarExistence;
  [name: string]: VarObj | VarExistence;
};

class VarMap {
  private map: VarObj = {};

  setExistenceFromObj(obj: Record<string, unknown>, parentPath = ""): void {
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
    // TODO add an Object Injection safety check here
    set(this.map, path, existence);
  }

  getExistence(path: string): VarExistence | undefined {
    path = path.trim();

    const exactExistence = get(this.map, path);
    if (exactExistence !== undefined) {
      return typeof exactExistence === "string"
        ? exactExistence
        : VarExistence.DEFINITELY;
    }

    const pathParts = path.split(".");
    if (pathParts.length === 1) {
      return undefined;
    }

    let bag: VarObj | VarExistence = this.map;
    while (pathParts.length > 0) {
      if (typeof bag["*"] === "string") {
        return bag["*"];
      }

      const part = pathParts.shift();
      // TODO add an Object Injection safety check here
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
    const mergedMap = merge({}, this.map, other.map);
    const merged = new VarMap();
    merged.map = mergedMap;

    return merged;
  }
}

export default VarMap;
