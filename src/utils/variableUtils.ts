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

import { type SafeString } from "@/types/stringTypes";

/**
 * Return a fresh variable name based on the root name and array of existing identifiers.
 * @param root the name of the variable
 * @param identifiers the array of existing identifiers
 * @param options identifier numbering options
 */
export function freshIdentifier(
  root: SafeString,
  identifiers: string[],
  options: { includeFirstNumber?: boolean; startNumber?: number } = {}
): string {
  const { includeFirstNumber, startNumber } = {
    includeFirstNumber: false,
    startNumber: 1,
    ...options,
  };

  // eslint-disable-next-line security/detect-non-literal-regexp -- guarding with SafeString
  const regexp = new RegExp(`^${root}(?<number>\\d+)$`);

  const used = identifiers
    .map((identifier) =>
      identifier === root
        ? startNumber
        : regexp.exec(identifier)?.groups?.number
    )
    .filter((x) => x != null)
    .map(Number);
  const next = Math.max(startNumber - 1, ...used) + 1;

  if (next === startNumber && !includeFirstNumber) {
    return root;
  }

  return `${root}${next}`;
}
