/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { zipObject } from "lodash";

export default function parseDomTable(
  table: HTMLTableElement
): Array<Record<string, string>> {
  let headers: Array<number | string>;
  const values: Array<Record<number | string, string>> = [];
  for (const [index, row] of [...table.rows].entries()) {
    if (index === 0) {
      // If there's at least one `th` in the first row, treat it as headers
      const isHeader = row.querySelector("th");

      // Parse every column header; use the index if it's not a header
      headers = [...row.cells].map((header, column) =>
        isHeader ? header.textContent.trim() : column
      );

      if (isHeader) {
        continue;
      }
    }

    // Create record for current row
    const cells = [...row.cells].map((cell) => cell.textContent.trim());
    values.push(zipObject(headers, cells));
  }

  return values;
}
