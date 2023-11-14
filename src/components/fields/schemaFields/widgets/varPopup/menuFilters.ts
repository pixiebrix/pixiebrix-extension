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

import { type UnknownRecord } from "type-fest/source/internal";
import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import { compact, reverse, toPath } from "lodash";
import {
  ALLOW_ANY_CHILD,
  IS_ARRAY,
  SELF_EXISTENCE,
} from "@/analysis/analysisVisitors/varAnalysis/varMap";
import { type KeyPath, type ShouldExpandNodeInitially } from "react-json-tree";
import { type UnknownObject } from "@/types/objectTypes";
import { getIn } from "formik";

/**
 * Array of [source, varMap] tuples
 */
export type MenuOptions = Array<[string, UnknownRecord]>;

/**
 * Filter top-level variables by source type. Currently, excludes integration variables because they're managed
 * automatically by the Page Editor.
 * @param options variable popover options
 */
export function excludeIntegrationVariables(options: MenuOptions): MenuOptions {
  return options.filter(([source]) => {
    const [kind] = source.split(":");
    return (kind as KnownSources) !== KnownSources.SERVICE;
  });
}

/**
 * Filter **top-level** variables based on the variable the user is currently editing.
 * @param options variable popover options
 * @param likelyVariable the variable the user is currently editing
 *
 * @see filterVarMapByVariable
 */
export function filterOptionsByVariable(
  options: MenuOptions,
  likelyVariable: string
): MenuOptions {
  if (
    likelyVariable == null ||
    likelyVariable === "@" ||
    !likelyVariable.startsWith("@")
  ) {
    return options;
  }

  const [base, ...rest] = toPath(likelyVariable);
  return options.filter(([source, vars]) => {
    if (rest.length === 0) {
      return Object.keys(vars).some((x) => x.startsWith(base));
    }

    // Require exact match if the likely variable is a path
    return Object.keys(vars).includes(base);
  });
}

function filterVarMapByPath(
  vars: UnknownRecord,
  path: string[]
): UnknownRecord {
  if (vars == null || path.length === 0) {
    return vars;
  }

  const [head, ...rest] = path;

  const entries: UnknownRecord = {
    // eslint-disable-next-line security/detect-object-injection -- Symbol
    [IS_ARRAY]: vars[IS_ARRAY],
    // eslint-disable-next-line security/detect-object-injection -- Symbol
    [SELF_EXISTENCE]: vars[SELF_EXISTENCE],
    // eslint-disable-next-line security/detect-object-injection -- Symbol
    [ALLOW_ANY_CHILD]: vars[ALLOW_ANY_CHILD],
  };

  for (const [key, varMap] of Object.entries(vars)) {
    if (
      (rest.length > 0 && key === head) ||
      (rest.length === 0 && key.startsWith(head))
    ) {
      // eslint-disable-next-line security/detect-object-injection -- from Object.entries
      entries[key] = filterVarMapByPath(varMap as UnknownRecord, rest);
    }
  }

  return entries;
}

/**
 * Recursively filter a varMap based on the variable the user is currently editing.
 * @param varMap the varMap
 * @param likelyVariable the variable the user is editing
 */
export function filterVarMapByVariable(
  varMap: UnknownRecord,
  likelyVariable: string
): UnknownRecord {
  if (
    likelyVariable == null ||
    likelyVariable === "@" ||
    !likelyVariable.startsWith("@")
  ) {
    return varMap;
  }

  return filterVarMapByPath(varMap, toPath(likelyVariable));
}

/**
 * Expand the variable map to the current level the user is editing. Only expands if the prefix matches.
 * @param varMap the variable map
 * @param likelyVariable the variable the user is editing
 */
export function expandCurrentVariableLevel(
  varMap: UnknownRecord,
  likelyVariable: string
): ShouldExpandNodeInitially {
  if (
    likelyVariable == null ||
    likelyVariable === "@" ||
    !likelyVariable.startsWith("@")
  ) {
    return () => false;
  }

  // If likelyVariable ends with ".", there's a part for the empty string at the end of the path. So can just use
  // as normal without logic for trailing "."
  const parts = toPath(likelyVariable);
  return (keyPath, data, level) => {
    // Key path from JSONTree is in reverse order
    const reverseKeyPath = [...keyPath].reverse();

    // Ensure the likelyVariable matches up to the requested depth
    for (let index = 0; index < level; index++) {
      // eslint-disable-next-line security/detect-object-injection -- numeric index
      if (parts[index] !== reverseKeyPath[index]) {
        return false;
      }
    }

    return level < parts.length;
  };
}

/**
 * Returns true if a varMap entry corresponds to an object or array.
 * @param value the varMap entry
 */
function isObjectLike(value: unknown): boolean {
  if (typeof value !== "object" || value == null) {
    return false;
  }

  const varMapEntry = value as UnknownRecord;

  // eslint-disable-next-line security/detect-object-injection -- constant symbols
  if (varMapEntry[IS_ARRAY] || varMapEntry[ALLOW_ANY_CHILD]) {
    return true;
  }

  // We're assuming empty objects observed in the trace will have ALLOW_ANY_CHILD set. Otherwise, this check will
  // mis-categorize them as primitives
  return Object.keys(value).length > 0;
}

function compareObjectKeys(
  lhsKey: string,
  rhsKey: string,
  obj: UnknownObject
): number {
  // eslint-disable-next-line security/detect-object-injection -- from Object.fromEntries in caller
  const lhsValue = obj[lhsKey];
  // eslint-disable-next-line security/detect-object-injection -- from Object.fromEntries in caller
  const rhsValue = obj[rhsKey];

  if (isObjectLike(lhsValue)) {
    if (isObjectLike(rhsValue)) {
      // Alphabetize object keys
      return lhsKey.localeCompare(rhsKey);
    }

    // Primitive rhsValue should appear before object/array lhsValue
    return 1;
  }

  // Primitive lhsValue should appear before object/array rhsValue
  if (isObjectLike(rhsValue)) {
    return -1;
  }

  return lhsKey.localeCompare(rhsKey);
}

/**
 * Sorts object keys in an alphabetic order, primitive values (string, boolean) should come before nested
 * Arrays and Objects.
 */
export function sortVarMapKeys(value: unknown): unknown {
  if (typeof value === "object" && value != null && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).sort(([lhsKey], [rhsKey]) =>
        compareObjectKeys(lhsKey, rhsKey, value as UnknownObject)
      )
    );
  }

  return value;
}

/**
 * Determine the default menu option based on the variable the user is currently editing.
 * @param options the menu options
 * @param likelyVariable the variable the user is editing
 */
export function defaultMenuOption(
  options: MenuOptions,
  likelyVariable: string
): KeyPath | null {
  const reversedOptions = reverse([...options]);

  if (reversedOptions.length === 0) {
    return null;
  }

  if (
    likelyVariable == null ||
    likelyVariable === "@" ||
    !likelyVariable.startsWith("@") ||
    toPath(likelyVariable).length === 0
  ) {
    // Must always have at least one option (e.g., the `@input`)
    // Prefer the last option, because that's the latest output

    const vars = reversedOptions[0][1];
    const first = Object.keys(vars)[0];
    return [first];
  }

  const parts = toPath(likelyVariable);

  const [head, ...rest] = parts;

  // Reverse options to find the last source that matches. (To account for shadowing)
  const sourceMatch = reversedOptions.find(([source, vars]) =>
    Object.hasOwn(vars, head)
  );

  if (!sourceMatch) {
    // If no exact match of source, return top-level partial match as default.
    const partialMatch = reversedOptions.find(([, vars]) =>
      Object.keys(vars).some((x) => x.startsWith(head))
    );
    return partialMatch ? [Object.keys(partialMatch[1])[0]] : null;
  }

  const [, vars] = sourceMatch;

  const result = [head];

  // eslint-disable-next-line security/detect-object-injection -- checked with hasOwn above
  let currentVars = filterVarMapByVariable(vars, likelyVariable)[
    head
  ] as UnknownRecord;

  for (const part of rest) {
    if (!Object.hasOwn(currentVars, part)) {
      // No exact match, return first partial match as default.
      result.unshift(
        Object.keys(sortVarMapKeys(currentVars)).find((x) => x.startsWith(part))
      );
      break;
    }

    // eslint-disable-next-line security/detect-object-injection -- checked with hasOwn above
    currentVars = currentVars[part] as UnknownRecord;

    // JSONTree key path is in reverse
    result.unshift(part);
  }

  return compact(result);
}

/**
 * Determine the next option to highlight on keydown/keyup.
 * @param options the variable popover options
 * @param keyPath the current active key path
 * @param likelyVariable the variable the user is editing
 * @param offset the offset to move forward/backward by
 */
export function moveMenuOption({
  options,
  likelyVariable,
  keyPath,
  offset,
}: {
  options: MenuOptions;
  likelyVariable: string;
  keyPath: KeyPath;
  offset: number;
}): KeyPath {
  if (keyPath == null) {
    return keyPath;
  }

  // KeyPath from JSONTree is in reverse order
  const keyPathParts = [...keyPath].reverse();
  const reversedOptions = [...options].reverse();

  const [head, ...rest] = keyPathParts;

  // Reverse options to find the last source that matches. (To account for shadowing)
  const sourceMatch = reversedOptions.find(([source, vars]) =>
    Object.hasOwn(vars, head)
  );

  if (!sourceMatch) {
    // Shouldn't happen, but just in case
    return keyPath;
  }

  const [source, sourceVars] = sourceMatch;

  // eslint-disable-next-line security/detect-object-injection -- checked with hasOwn above
  const varMap = filterVarMapByVariable(sourceVars, likelyVariable)[
    head
  ] as UnknownRecord;

  // User is switching between top-level variables
  if (rest.length === 0) {
    const sourceIndex = options.findIndex(([x]) => x === source);
    const [, nextSourceVars] = options.at(
      (sourceIndex + offset) % options.length
    );
    return [Object.keys(nextSourceVars)[0]];
  }

  const lastProperty = rest.pop();

  const lastVars = getIn(varMap, rest.map(String)) as UnknownRecord;

  const sortedVarNames = Object.keys(sortVarMapKeys(lastVars));

  const varIndex = sortedVarNames.indexOf(String(lastProperty));

  return reverse([
    head,
    ...rest,
    sortedVarNames.at((varIndex + offset) % sortedVarNames.length),
  ]);
}
