/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { isNullOrBlank, isObject } from "@/utils";
import { isEqual, isPlainObject, unary, uniq } from "lodash";
import { validateRegistryId } from "@/types/helpers";
import { normalizeHeader } from "@/contrib/google/sheets/sheetsHelpers";
import { sheets } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { BusinessError } from "@/errors/businessErrors";

type CellValue = string | number | null;

type Entry = {
  header: string;
  value: CellValue;
};

type RowValues =
  | Record<string, CellValue>
  | Array<Record<string, CellValue>>
  | Entry[];
type KnownShape = "entries" | "multi" | "single";
type Shape = KnownShape | "infer";

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
    shape: {
      type: "string",
      description:
        "The row input shape, or infer to automatically detect the format",
      enum: ["infer", "single", "multi", "entries"],
      default: "infer",
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
        {
          type: "array",
          description: "The rows to append to the sheet",
          items: {
            type: "object",
            additionalProperties: { type: ["number", "string", "null"] },
          },
        },
      ],
    },
  },
  ["spreadsheetId", "tabName", "rowValues"]
);

function makeRowCells(headerRow: string[], rowEntries: Entry[]): CellValue[] {
  const row = [];
  const matched = new Set();

  const fields = headerRow.map(unary(normalizeHeader));
  console.debug(`Normalized headers: ${fields.join(", ")}`);

  for (const header of fields) {
    const normalizedHeader = normalizeHeader(header);
    const rowValue = rowEntries.find(
      (x) => normalizeHeader(x.header) === normalizedHeader
    );
    if (rowValue) {
      matched.add(rowValue.header);
      row.push(rowValue.value);
    } else {
      row.push(null);
    }
  }

  const unmatched = rowEntries
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

export function detectShape(rowValues: RowValues): KnownShape {
  if (Array.isArray(rowValues)) {
    const entryKeys = new Set(["header", "value"]);
    if (
      rowValues.every(
        (entry) =>
          isObject(entry) && isEqual(new Set(Object.keys(entry)), entryKeys)
      )
    ) {
      return "entries";
    }

    return "multi";
  }

  return "single";
}

// Validate the shape wrt the provided rowValues. Could refactor the JSON Schema to perform the validation. There would
// be 4 oneOf clauses, one for each shape.
export function validateShape(shape: KnownShape, rowValues: RowValues) {
  switch (shape) {
    case "entries": {
      const entryKeys = new Set(["header", "value"]);
      if (
        !Array.isArray(rowValues) ||
        !rowValues.every(
          (entry) =>
            isObject(entry) && isEqual(new Set(Object.keys(entry)), entryKeys)
        )
      ) {
        throw new BusinessError("Expected array of header/value entries");
      }

      return;
    }

    case "single": {
      if (!isObject(rowValues)) {
        throw new BusinessError("Expected object");
      }

      return;
    }

    case "multi": {
      if (
        !Array.isArray(rowValues) ||
        !rowValues.every((entry) => isObject(entry))
      ) {
        throw new BusinessError("Expected array of objects");
      }

      // eslint-disable-next-line no-useless-return -- no fall through
      return;
    }

    default: {
      // eslint-disable-next-line no-useless-return -- no fall through
      return;
    }
  }
}

const rowEntries = (row: Record<string, CellValue>) =>
  Object.entries(row).map(([header, value]) => ({
    header,
    value,
  }));

export function normalizeShape(shape: Shape, rowValues: RowValues): Entry[][] {
  const knownShape = shape === "infer" ? detectShape(rowValues) : shape;
  validateShape(knownShape, rowValues);

  switch (knownShape) {
    case "single": {
      const row = rowValues as Record<string, CellValue>;
      return [rowEntries(row)];
    }

    case "entries": {
      const entries = rowValues as Entry[];
      return [entries];
    }

    case "multi": {
      const rows = rowValues as Array<Record<string, CellValue>>;
      return rows.map((row) => rowEntries(row));
    }

    default: {
      throw new BusinessError(`Unexpected shape: ${shape}`);
    }
  }
}

export class GoogleSheetsAppend extends Effect {
  constructor() {
    super(
      GOOGLE_SHEETS_APPEND_ID,
      "Add Google sheet row",
      "Add a row of data to a Google sheet with headings",
      "faTable"
    );
  }

  inputSchema: Schema = APPEND_SCHEMA;

  async effect(
    {
      spreadsheetId,
      tabName,
      shape = "infer",
      rowValues: rawValues = {},
    }: BlockArg<{
      spreadsheetId: string;
      tabName: string;
      shape: Shape;
      rowValues: RowValues;
    }>,
    { logger }: BlockOptions
  ): Promise<void> {
    const rows = normalizeShape(shape, rawValues);
    const valueHeaders = uniq(
      rows.flatMap((row) => row.map((x: Entry) => x.header))
    );

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

    await sheets.appendRows(
      spreadsheetId,
      tabName,
      rows.map((row) => makeRowCells(currentHeaders, row))
    );
  }
}
