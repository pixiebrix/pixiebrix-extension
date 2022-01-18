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

import { zip, zipObject } from "lodash";

interface ParsingOptions {
  orientation?: "vertical" | "horizontal" | "infer";
}

type Cell = { type: "value" | "header"; value: string };

type FieldNames = Array<number | string>;
type Records = Array<Record<string, string>>;

/** Flattened data extracted from table */
type RawTableContent = Cell[][];

/** Normalized data extracted from table, after transposition, if required */
interface NormalizedData {
  fieldNames: FieldNames;
  body: string[][];
}

/** Final parsed records and field names */
interface ParsedTable {
  fieldNames: FieldNames;
  records: Records;
}

function guessDirection(
  table: HTMLTableElement
): ParsingOptions["orientation"] {
  const labelRatio =
    table.rows[0].querySelectorAll("th").length /
    table.querySelectorAll("th").length;
  return labelRatio < 0.5 ? "horizontal" : "vertical";
}

// TODO: Normalize rowspan and colspan in here as well
function flattenTableContent(table: HTMLTableElement): RawTableContent {
  return [...table.rows].map((row) =>
    [...row.cells].map((cell) => ({
      type: cell.tagName === "TH" ? "header" : "value",
      value: cell.textContent.trim(),
    }))
  );
}

function extractData(
  table: RawTableContent,
  orientation: ParsingOptions["orientation"]
): NormalizedData {
  if (orientation === "horizontal") {
    // Transpose table so we only deal with one orientation
    table = zip(...table);
  }

  // Carefully deal with cells because the "table" could just be an empty array
  const [firstRow] = table;
  const lastCell = firstRow?.[firstRow.length - 1];
  const hasHeader = lastCell?.type === "header";

  const textTable = table.map((row) => row.map((cell) => cell.value));
  if (hasHeader) {
    const [headers, ...body] = textTable;
    return { fieldNames: headers, body };
  }

  // If it has no headers, use a 0-based index as header
  return { fieldNames: [...(firstRow ?? []).keys()], body: textTable };
}

export default function parseDomTable(
  table: HTMLTableElement,
  { orientation = "infer" }: ParsingOptions = {}
): ParsedTable {
  const { fieldNames, body } = extractData(
    flattenTableContent(table),
    orientation === "infer" ? guessDirection(table) : orientation
  );

  const records = body.map((row) => zipObject(fieldNames, row));
  return { records, fieldNames };
}
