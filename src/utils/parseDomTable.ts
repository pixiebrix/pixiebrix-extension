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

interface ParsingOptions {
  direction?: "rows" | "columns";
}
type Headers = Array<number | string>;

interface NormalizedTable {
  headers: Headers;
  body: string[][];
}

type Table = Array<Record<string, string>>;

function guessDirection(table: HTMLTableElement): ParsingOptions["direction"] {
  const labelRatio =
    table.rows[0].querySelectorAll("th").length /
    table.querySelectorAll("th").length;
  return labelRatio < 0.5 ? "columns" : "rows";
}

// TODO: Normalize rowspan and colspan in here as well
function normalizeTable(
  table: HTMLTableElement,
  direction = "rows"
): NormalizedTable {
  const content = [...table.rows].map((row) =>
    [...row.cells].map((cell) => cell.textContent)
  );

  if (direction === "rows") {
    const [firstRow] = table.rows;
    const hasHeader =
      firstRow?.cells[firstRow.cells.length - 1]?.tagName === "TH";
    if (hasHeader) {
      const [headers, ...body] = content;
      return { headers, body: body };
    }

    return { headers: [...content[0].keys()], body: content };
  }

  const hasHeader =
    table.rows[table.rows.length - 1]?.cells[0]?.tagName === "TH";
  if (hasHeader) {
    const headers = [];
    const body = [];
    for (const row of content) {
      const [rowHeader, ...rowData] = row;
      headers.push(rowHeader);
      body.push(rowData);
    }
    return { headers, body };
  }

  return { headers: [...content[0].keys()], body: content };
}

export default function parseDomTable(
  table: HTMLTableElement,
  { direction = guessDirection(table) }: ParsingOptions
): Table {
  let headers: Headers;
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
