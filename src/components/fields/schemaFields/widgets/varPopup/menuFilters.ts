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

import { type UnknownRecord } from "type-fest";
import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import { compact, reverse, toPath } from "lodash";
import {
  ALLOW_ANY_CHILD,
  IS_ARRAY,
  SELF_EXISTENCE,
} from "@/analysis/analysisVisitors/varAnalysis/varMap";
import { type KeyPath, type ShouldExpandNodeInitially } from "react-json-tree";
import { getIn } from "formik";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Array of [source, varMap] tuples
 */
export type MenuOptions = Array<[string, UnknownRecord]>;

/**
 * Returns true if the value is null or is likely plain text (i.e., not a variable).
 */
function isTextOrNullVar(value: string | null): boolean {
  return value == null || value === "@" || !value.startsWith("@");
}

/**
 * Convert a variable to a normalized variable path, removing optional chaining. Result is suitable for filtering
 * by path prefix.
 */
function toVarPath(value: string | null): string[] {
  if (value == null) {
    return [];
  }

  return toPath(value.replaceAll("?.", "."));
}

/**
 * Filter top-level variables by source type. Currently, excludes integration variables because they're managed
 * automatically by the Page Editor.
 * @param options variable popover options
 */
export function excludeIntegrationVariables(options: MenuOptions): MenuOptions {
  return options.filter(([source]) => {
    const [kind] = source.split(":");
    return (kind as KnownSources) !== KnownSources.INTEGRATION;
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
  likelyVariable: string | null,
): MenuOptions {
  if (isTextOrNullVar(likelyVariable)) {
    return options;
  }

  const [base, ...rest] = toVarPath(likelyVariable);

  assertNotNullish(base, `Expected base to be non-null: ${likelyVariable}`);

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
  path: string[],
): UnknownRecord {
  if (vars == null || path.length === 0) {
    return vars;
  }

  const [head, ...rest] = path;

  assertNotNullish(head, "Expected head to be non-null");

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
  likelyVariable: string | null,
): UnknownRecord {
  if (isTextOrNullVar(likelyVariable)) {
    return varMap;
  }

  return filterVarMapByPath(varMap, toVarPath(likelyVariable));
}

/**
 * Expand the variable map to the current level the user is editing. Only expands if the prefix matches.
 * @param varMap the variable map
 * @param likelyVariable the variable the user is editing
 */
export function expandCurrentVariableLevel(
  varMap: UnknownRecord,
  likelyVariable: string | null,
): ShouldExpandNodeInitially {
  if (isTextOrNullVar(likelyVariable)) {
    return () => false;
  }

  // If likelyVariable ends with ".", there's a part for the empty string at the end of the path. So can just use
  // as normal without logic for trailing "."
  const parts = toVarPath(likelyVariable);
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
  obj: UnknownObject,
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
        compareObjectKeys(lhsKey, rhsKey, value as UnknownObject),
      ),
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
  likelyVariable: string | null,
): KeyPath | null {
  const reversedOptions = reverse([...options]);

  if (reversedOptions.length === 0) {
    return null;
  }

  const parts = toVarPath(likelyVariable);

  if (isTextOrNullVar(likelyVariable) || parts.length === 0) {
    // Must always have at least one option (e.g., the `@input`)
    // Prefer the last option, because that's the latest output

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- length check above
    const vars = reversedOptions[0]![1];
    const first = Object.keys(vars)[0];

    assertNotNullish(first, "Expected first to be non-null");

    return [first];
  }

  const [head, ...rest] = parts;

  assertNotNullish(head, "Expected head to be non-null");

  // Reverse options to find the last source that matches. (To account for shadowing)
  const sourceMatch = reversedOptions.find(([source, vars]) =>
    Object.hasOwn(vars, head),
  );

  if (!sourceMatch) {
    // If no exact match of source, return top-level partial match as default.
    const partialMatch = reversedOptions.find(([, vars]) =>
      Object.keys(vars).some((x) => x.startsWith(head)),
    );

    if (partialMatch) {
      const key = Object.keys(partialMatch[1])[0];
      assertNotNullish(key, "Expected key to exist");

      return [key];
    }

    return null;
  }

  const [, vars] = sourceMatch;

  const result = [head];

  // eslint-disable-next-line security/detect-object-injection -- checked with hasOwn above
  let currentVars = filterVarMapByVariable(vars, likelyVariable)[
    head
  ] as UnknownRecord;

  for (const part of rest) {
    assertNotNullish(part, "Expected part to be non-null");

    // Find the the first partial match, if it exists
    if (!Object.hasOwn(currentVars, part)) {
      const match = Object.keys(
        sortVarMapKeys(currentVars) as UnknownRecord,
      ).find((x) => x.startsWith(part));

      if (match) {
        result.unshift(match);
      }

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
  likelyVariable: string | null;
  keyPath: KeyPath | null;
  offset: number;
}): KeyPath | null {
  if (keyPath == null) {
    return keyPath;
  }

  // KeyPath from JSONTree is in reverse order
  const keyPathParts = [...keyPath].reverse();
  const reversedOptions = [...options].reverse();

  const [head, ...rest] = keyPathParts;

  assertNotNullish(head, "Expected head to be non-null");

  // Reverse options to find the last source that matches. (To account for shadowing)
  const sourceMatch = reversedOptions.find(([source, vars]) =>
    Object.hasOwn(vars, head),
  );

  if (!sourceMatch) {
    // Shouldn't happen, but just in case
    return keyPath;
  }

  const [source, sourceVars] = sourceMatch;

  // eslint-disable-next-line security/detect-object-injection -- checked with hasOwn above
  const varMap = filterVarMapByVariable(sourceVars, likelyVariable)[head];

  // User is switching between top-level variables
  if (rest.length === 0) {
    const sourceIndex = options.findIndex(([x]) => x === source);
    const option = options.at((sourceIndex + offset) % options.length);

    assertNotNullish(option, "Expected option to exist");
    const [, nextSourceVars] = option;

    const key = Object.keys(nextSourceVars)[0];
    assertNotNullish(key, "Expected key to exist");

    return [key];
  }

  const lastProperty = rest.pop();

  const lastVars = getIn(varMap, rest.map(String)) as UnknownRecord;

  const sortedVarNames = Object.keys(sortVarMapKeys(lastVars) as UnknownRecord);

  const varIndex = sortedVarNames.indexOf(String(lastProperty));

  return compact(
    reverse([
      head,
      ...rest,
      sortedVarNames.at((varIndex + offset) % sortedVarNames.length),
    ]),
  );
}
