/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Effect } from "@/types";
import { faTable } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import {
  appendRows,
  batchGet,
  createTab,
} from "@/contrib/google/sheets/handlers";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

type CellValue = string | number | null;

interface RowValue {
  header: string;
  value: CellValue;
}

function columnToLetter(column: number): string {
  // https://stackoverflow.com/a/21231012/402560
  let temp,
    letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim();
}

function makeValues(headerRow: string[], rowValues: RowValue[]): CellValue[] {
  const row = [];
  const matched = new Set();

  const fields = headerRow.map(normalizeHeader);
  console.debug(`Normalized headers: ${fields.join(", ")}`);

  for (const header of fields) {
    const normalizedHeader = normalizeHeader(header);
    const rowValue = rowValues.find(
      (x) => normalizeHeader(x.header) === normalizedHeader
    );
    if (rowValue) {
      matched.add(rowValue.header);
      row.push(rowValue.value);
    } else {
      row.push(null);
    }
  }
  const unmatched = rowValues
    .map((x) => x.header)
    .filter((x) => !matched.has(x));
  if (unmatched.length) {
    console.warn(
      `${unmatched.length} field(s) were unmatched: ${unmatched.join(", ")}`
    );
  }
  return row;
}

async function getHeaders(
  spreadsheetId: string,
  tabName: string
): Promise<string[]> {
  // Lookup the headers in the first row so we can determine where to put the values
  const response = await batchGet(
    spreadsheetId,
    `${tabName}!A1:${columnToLetter(256)}1`
  );
  return response.valueRanges[0].values[0];
}

export class GoogleSheetsAppend extends Effect {
  constructor() {
    super(
      "@pixiebrix/google/sheets-append",
      "Add Google sheet row",
      "Record data to Google sheets",
      faTable
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      spreadsheetId: {
        type: "string",
        description: "The ID of the spreadsheet to update.",
      },
      tabName: {
        type: "string",
        description: "The tab of the spreadsheet to update.",
      },
      rowValues: {
        type: "array",
        description: "The values to append to the sheet",
        items: {
          type: "object",
          properties: {
            header: { type: "string" },
            value: { type: ["number", "string", "null"] },
          },
          required: ["header"],
        },
        minItems: 1,
      },
    },
    ["spreadsheetId", "tabName", "rowValues"]
  );

  async effect({ spreadsheetId, tabName, rowValues }: BlockArg): Promise<void> {
    const valueHeaders = rowValues.map((x: RowValue) => x.header);
    let currentHeaders: string[];

    try {
      currentHeaders = await getHeaders(spreadsheetId, tabName);
      console.debug(
        `Found headers for ${tabName}: ${currentHeaders.join(", ")}`
      );
    } catch (ex) {
      console.debug(`Creating tab ${tabName}`);
      await createTab(spreadsheetId, tabName);
    }

    if (
      !currentHeaders ||
      currentHeaders.every((x) => x && x.toString().trim() === "")
    ) {
      console.debug(`Writing header row for ${tabName}`);
      await appendRows(spreadsheetId, tabName, [valueHeaders]);
      currentHeaders = valueHeaders;
    }

    await appendRows(spreadsheetId, tabName, [
      makeValues(currentHeaders, rowValues),
    ]);
  }
}

registerBlock(new GoogleSheetsAppend());
