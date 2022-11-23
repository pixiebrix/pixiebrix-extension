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

const SELF_EXISTENCE = Symbol("SELF_EXISTENCE");
const ALLOW_ANY_CHILD = Symbol("ALLOW_ANY_CHILD");
type ExistenceMap = {
  [SELF_EXISTENCE]?: VarExistence;
  [ALLOW_ANY_CHILD]?: boolean;

  [name: string]: ExistenceMap;
};

class VarMap {
  private map: Record<string, ExistenceMap> = {};

  public setExistenceFromValues(
    source: string,
    values: Record<string, unknown>,
    parentPath = ""
  ): void {
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "object") {
        this.setExistenceFromValues(
          source,
          value as Record<string, unknown>,
          parentPath === "" ? key : `${parentPath}.${key}`
        );
      } else {
        setWith(
          this.map,
          [source, ...toPath(parentPath), key, SELF_EXISTENCE],
          VarExistence.DEFINITELY,
          (x) =>
            typeof x === "undefined"
              ? {
                  [SELF_EXISTENCE]: VarExistence.DEFINITELY,
                }
              : x
        );
      }
    }
  }

  public setOutputKeyExistence(
    source: string,
    outputKey: string,
    existence: VarExistence,
    allowAnyChild: boolean
  ): void {
    // While any block can provide no more than one output key,
    // we are safe to create a new object for the 'source'
    this.map[source] = {
      [outputKey]: {
        [SELF_EXISTENCE]: existence,
        [ALLOW_ANY_CHILD]: allowAnyChild,
      },
    };
  }

  public addSourceMap(varMap: VarMap): void {
    for (const [source, existenceMap] of Object.entries(varMap.map)) {
      this.map[source] = existenceMap;
    }
  }

  public getExistence(path: string): VarExistence | undefined {
    const pathParts = toPath(path);

    for (const sourceMap of Object.values(this.map)) {
      const exactExistence = get(sourceMap, pathParts)?.[SELF_EXISTENCE];
      if (typeof exactExistence === "string") {
        return exactExistence;
      }

      if (pathParts.length === 1) {
        continue;
      }

      let bag = sourceMap;
      const pathPartsCopy = [...pathParts];
      while (pathPartsCopy.length > 0) {
        if (bag[ALLOW_ANY_CHILD]) {
          return VarExistence.MAYBE;
        }

        const part = pathPartsCopy.shift();
        bag = bag[part];
        if (typeof bag === "undefined") {
          break;
        }
      }
    }

    return undefined;
  }

  clone(): VarMap {
    const clone = new VarMap();
    clone.map = cloneDeep(this.map);
    return clone;
  }
}

export default VarMap;
