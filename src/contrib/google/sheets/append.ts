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

import { Effect, UnknownObject } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { isNullOrBlank } from "@/utils";
import { isPlainObject, unary } from "lodash";
import { validateRegistryId } from "@/types/helpers";
import { normalizeHeader } from "@/contrib/google/sheets/sheetsHelpers";
import { sheets } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors";

type CellValue = string | number | null;

interface RowValue {
  header: string;
  value: CellValue;
}

export const APPEND_SCHEMA: Schema = propertiesToSchema(
  {
    spreadsheetId: {
      type: "string",
      description: "The ID of the spreadsheet to update.",
    },
    tabName: {
      type: "string",
      description: "The tab name of the spreadsheet to update.",
    },
    rowValues: {
      oneOf: [
        {
          type: "object",
          description: "The row to append to the sheet",
          additionalProperties: { type: ["number", "string", "null"] },
        },
        {
          type: "array",
          description: "The row to append to the sheet",
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
      ],
    },
  },
  ["spreadsheetId", "tabName", "rowValues"]
);

function makeValues(headerRow: string[], rowValues: RowValue[]): CellValue[] {
  const row = [];
  const matched = new Set();

  const fields = headerRow.map(unary(normalizeHeader));
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
  if (unmatched.length > 0) {
    console.warn(
      `${unmatched.length} field(s) were unmatched: ${unmatched.join(", ")}`
    );
  }

  return row;
}

export const GOOGLE_SHEETS_APPEND_ID = validateRegistryId(
  "@pixiebrix/google/sheets-append"
);

function isAuthError(error: unknown): boolean {
  return (
    isPlainObject(error) &&
    ([404, 401, 403] as unknown[]).includes((error as UnknownObject).code)
  );
}

export class GoogleSheetsAppend extends Effect {
  constructor() {
    super(
      GOOGLE_SHEETS_APPEND_ID,
      "Add Google sheet row",
      "Add a row of data to a Google sheet",
      "faTable"
    );
  }

  inputSchema: Schema = APPEND_SCHEMA;

  async effect(
    {
      spreadsheetId,
      tabName,
      rowValues: rawValues = {},
    }: BlockArg<{
      spreadsheetId: string;
      tabName: string;
      rowValues: Record<string, CellValue> | RowValue[];
    }>,
    { logger }: BlockOptions
  ): Promise<void> {
    const rowValues =
      typeof rawValues === "object"
        ? Object.entries(rawValues).map(([header, value]) => ({
            header,
            value,
          }))
        : rawValues;

    const valueHeaders = rowValues.map((x: RowValue) => x.header);
    let currentHeaders: string[];

    try {
      currentHeaders = await sheets.getHeaders({ spreadsheetId, tabName });
      console.debug(
        `Found headers for ${tabName}: ${currentHeaders.join(", ")}`
      );
    } catch (error) {
      logger.warn(`Error retrieving headers: ${getErrorMessage(error)}`, {
        error,
      });
      if (isAuthError(error)) {
        throw error;
      }

      logger.info(`Creating tab ${tabName}`);
      await sheets.createTab(spreadsheetId, tabName);
    }

    if (!currentHeaders || currentHeaders.every((x) => isNullOrBlank(x))) {
      logger.info(`Writing header row for ${tabName}`);
      await sheets.appendRows(spreadsheetId, tabName, [valueHeaders]);
      currentHeaders = valueHeaders;
    }

    await sheets.appendRows(spreadsheetId, tabName, [
      makeValues(currentHeaders, rowValues),
    ]);
  }
}
