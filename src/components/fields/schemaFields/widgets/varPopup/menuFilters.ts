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
import { toPath } from "lodash";
import {
  ALLOW_ANY_CHILD,
  IS_ARRAY,
  SELF_EXISTENCE,
} from "@/analysis/analysisVisitors/varAnalysis/varMap";
import { type ShouldExpandNodeInitially } from "react-json-tree";

type MenuOptions = Array<[string, UnknownRecord]>;

/**
 * Filter top-level variables by source type. Currently, excludes service variables because they're managed
 * automatically by the Page Editor.
 * @param options variable popover options
 */
export function excludeServices(options: MenuOptions): MenuOptions {
  return options.filter(([source]) => {
    const [kind] = source.split(":");
    return kind !== KnownSources.SERVICE;
  });
}

/**
 * Filter top-level variables based on the variable the user is currently editing.
 * @param options variable popover options
 * @param likelyVariable the variable the user is currently editing
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
 * @param vars
 * @param likelyVariable
 */
export function filterVarMapByVariable(
  vars: UnknownRecord,
  likelyVariable: string
): UnknownRecord {
  if (
    likelyVariable == null ||
    likelyVariable === "@" ||
    !likelyVariable.startsWith("@")
  ) {
    return vars;
  }

  return filterVarMapByPath(vars, toPath(likelyVariable));
}

export function expandCurrentVariableLevel(
  vars: UnknownRecord,
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
  return (keyPath, data, level) => level < parts.length;
}
