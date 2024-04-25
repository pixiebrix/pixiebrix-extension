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

import { type SafeString } from "@/types/stringTypes";
import type { Expression, OutputKey } from "@/types/runtimeTypes";
import { toExpression } from "@/utils/expressionUtils";
import { VARIABLE_REFERENCE_PREFIX } from "@/types/runtimeTypes";
import { trimEnd } from "lodash";

/**
 * Return a fresh variable name based on the root name and array of existing identifiers.
 * @param root the name of the variable
 * @param identifiers the array of existing identifiers
 * @param options identifier numbering options
 */
export function freshIdentifier(
  root: SafeString,
  identifiers: string[],
  options: { includeFirstNumber?: boolean; startNumber?: number } = {},
): string {
  const { includeFirstNumber, startNumber } = {
    includeFirstNumber: false,
    startNumber: 1,
    ...options,
  };

  // eslint-disable-next-line security/detect-non-literal-regexp -- guarding with SafeString
  const regexp = new RegExp(`^${root}(?<number>\\d+)$`);

  const used = new Set(
    identifiers
      .map((identifier) =>
        identifier === root
          ? startNumber
          : regexp.exec(identifier)?.groups?.number,
      )
      .filter((x) => x != null)
      .map(Number),
  );

  const justInCaseUpperLimit = 1000;
  // Count up from start number until we find an un-used number
  for (let i = startNumber; i < justInCaseUpperLimit; i++) {
    if (!used.has(i)) {
      if (i === startNumber && !includeFirstNumber) {
        return root;
      }

      return `${root}${i}`;
    }
  }

  throw new Error(
    `Failed to generate a fresh identifier after ${justInCaseUpperLimit} attempts, something went wrong`,
  );
}

/**
 * Returns a variable reference expression for the given variable name.
 */
export function makeVariableExpression<TValue extends string>(
  variableName: OutputKey,
): Expression<TValue, "var">;
export function makeVariableExpression<TValue extends string | null>(
  variableName: OutputKey | null,
): Expression<TValue | null, "var"> {
  if (variableName) {
    return toExpression(
      "var",
      `${VARIABLE_REFERENCE_PREFIX}${variableName}` as TValue,
    );
  }

  return toExpression("var", null);
}

/**
 * Strip the optional chaining operator "?" from a path part.
 * @param pathPart a part of a variable expression path
 * @see getPropByPath
 */
export function stripOptionalChaining(pathPart: string): string {
  return trimEnd(pathPart, "?");
}
