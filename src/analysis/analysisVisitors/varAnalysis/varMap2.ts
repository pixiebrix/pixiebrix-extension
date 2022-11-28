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

import { cloneDeep, get, setWith, toPath } from "lodash";

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

  /**
   * Converts an object containing variables to a var existence map. Each node gets a DEFINITELY existence. Ex. converting trace output to an existence map
   * @param source The source of the values context (ex.: brick, trace, page reader)
   * @param values The object containing the context values
   * @param parentPath Parent path for the values. For instance, a page reader context gets a parent path of "@input"
   */
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
            x ?? {
              [SELF_EXISTENCE]: VarExistence.DEFINITELY,
            }
        );
      }
    }
  }

  /**
   * Adds an existence for a block with output key
   * As of now we only set existence for the root object, since output schema is not supported by the VarAnalysis
   * @param source The source of the values context (ex.: brick, trace, page reader)
   * @param outputKey The output key of the block
   * @param existence Existence of the output key (MAYBE for a conditional block)
   * @param allowAnyChild True if the output key can have any child, i.e. the output schema is unknown
   */
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

    for (const sourceMap of Object.values(this.map)) {
      const exactExistence = (get(sourceMap, pathParts) as ExistenceMap)?.[
        SELF_EXISTENCE
      ];
      if (typeof exactExistence === "string") {
        return true;
      }

      if (pathParts.length === 1) {
        continue;
      }

      let bag = sourceMap;
      const pathPartsCopy = [...pathParts];
      while (pathPartsCopy.length > 0) {
        if (bag[ALLOW_ANY_CHILD]) {
          return true;
        }

        const part = pathPartsCopy.shift();
        bag = bag[part];
        if (bag == null) {
          break;
        }
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
