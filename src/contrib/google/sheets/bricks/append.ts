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

import { isEmpty, isEqual, unary, uniq } from "lodash";
import { validateRegistryId } from "@/types/helpers";
import { normalizeHeader } from "@/contrib/google/sheets/core/sheetsHelpers";
import * as sheets from "@/contrib/google/sheets/core/sheetsApi";
import { BusinessError, PropError } from "@/errors/businessErrors";
import {
  GOOGLE_OAUTH2_PKCE_INTEGRATION_ID,
  SHEET_INTEGRATION_SCHEMA,
} from "@/contrib/google/sheets/core/schemas";
import { type Schema } from "@/types/schemaTypes";
import { EffectABC } from "@/types/bricks/effectTypes";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type SpreadsheetTarget } from "@/contrib/google/sheets/core/sheetsApi";
import { isNullOrBlank } from "@/utils/stringUtils";
import { isObject } from "@/utils/objectUtils";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { INTEGRATIONS_BASE_SCHEMA_URL } from "@/integrations/constants";

type CellValue = string | number | null;

export type Entry = {
  header: string;
  value: CellValue;
};

export type RowValues =
  | Record<string, CellValue>
  | Array<Record<string, CellValue>>
  | Entry[];
type KnownShape = "entries" | "multi" | "single";
export type Shape = KnownShape | "infer";

export const APPEND_SCHEMA: Schema = propertiesToSchema(
  {
    googleAccount: {
      title: "Google Account",
      oneOf: [
        {
          $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${GOOGLE_OAUTH2_PKCE_INTEGRATION_ID}`,
        },
      ],
    },
    spreadsheetId: {
      // Spreadsheet ID or service config
      oneOf: [
        // First one here should be BASE_SHEET_SCHEMA,
        // but the runtime can't dereference it properly
        {
          type: "string",
          minLength: 1,
        },
        SHEET_INTEGRATION_SCHEMA,
      ],
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
    requireAllHeaders: {
      type: "boolean",
      title: "Require All Headers",
      description:
        "Validate that submitted data includes all headers in the sheet",
      default: true,
    },
    requireOnlyKnownHeaders: {
      type: "boolean",
      title: "Require Only Known Headers",
      description: "Validate that all submitted headers exist in the sheet",
      default: true,
    },
    requireSheetIsVisible: {
      type: "boolean",
      title: "Require Visible Sheet",
      description: "Validate that the target sheet is not hidden",
      default: true,
    },
  },
  // For backwards compatibility, googleAccount is not required
  ["spreadsheetId", "tabName", "rowValues"],
);

function makeRowCells(headerRow: string[], rowEntries: Entry[]): CellValue[] {
  const row = [];
  const matched = new Set();

  const fields = headerRow.map(unary(normalizeHeader));
  console.debug(`Normalized headers: ${fields.join(", ")}`);

  for (const header of fields) {
    const normalizedHeader = normalizeHeader(header);
    const rowValue = rowEntries.find(
      (x) => normalizeHeader(x.header) === normalizedHeader,
    );
    // The Sheets API is flexible enough to handle preceding empty columns, so
    // we don't need to manually add empty/blank cells to our appending row data.
    //
    // Note: We currently don't support intermediate empty columns, which would
    // require us to use the batchUpdate endpoint instead of append.
    // See: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate
    if (rowValue) {
      matched.add(rowValue.header);
      row.push(rowValue.value);
    }
  }

  const unmatched = rowEntries
    .map((x) => x.header)
    .filter((x) => !matched.has(x));
  if (unmatched.length > 0) {
    console.warn(
      `${unmatched.length} field(s) were unmatched: ${unmatched.join(", ")}`,
    );
  }

  return row;
}

export const GOOGLE_SHEETS_APPEND_ID = validateRegistryId(
  "@pixiebrix/google/sheets-append",
);

export function detectShape(rowValues: RowValues): KnownShape {
  if (Array.isArray(rowValues)) {
    const entryKeys = new Set(["header", "value"]);
    if (
      rowValues.every(
        (entry) =>
          isObject(entry) && isEqual(new Set(Object.keys(entry)), entryKeys),
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
function validateShape(shape: KnownShape, rowValues: RowValues) {
  switch (shape) {
    case "entries": {
      const entryKeys = new Set(["header", "value"]);
      if (
        !Array.isArray(rowValues) ||
        !rowValues.every(
          (entry) =>
            isObject(entry) && isEqual(new Set(Object.keys(entry)), entryKeys),
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

// Exported for testing
export function checkForBlankIntermediateColumns(currentHeaders: string[]) {
  let foundNonBlankHeader = false;
  for (const header of currentHeaders) {
    if (!isNullOrBlank(header)) {
      foundNonBlankHeader = true;
    } else if (foundNonBlankHeader) {
      throw new BusinessError(
        "Invalid header row. Must not contain any blank columns between headers in the sheet",
      );
    }
  }
}

// Exported for testing
export function checkForMissingValueHeaders(
  currentSheetHeaders: string[],
  valueHeaders: string[],
) {
  const missingHeaders = currentSheetHeaders.filter(
    (header) => !valueHeaders.includes(header),
  );
  if (missingHeaders.length > 0) {
    throw new BusinessError(
      `One or more headers in the sheet were not provided in brick inputs: ${missingHeaders.join(
        ", ",
      )}`,
    );
  }
}

// Exported for testing
export function checkAllValueHeadersExist(
  currentSheetHeaders: string[],
  valueHeaders: string[],
) {
  const extraValueHeaders = valueHeaders.filter(
    (header) => !currentSheetHeaders.includes(header),
  );
  if (extraValueHeaders.length > 0) {
    throw new BusinessError(
      `One or more headers provided in brick inputs do not exist in the sheet: ${extraValueHeaders.join(
        ", ",
      )}`,
    );
  }
}

export class GoogleSheetsAppend extends EffectABC {
  constructor() {
    super(
      GOOGLE_SHEETS_APPEND_ID,
      "Add Google sheet row",
      "Add a row of data to a Google sheet with headings",
    );
  }

  inputSchema: Schema = APPEND_SCHEMA;

  async effect(
    {
      googleAccount,
      spreadsheetId: spreadsheetIdArg,
      tabName,
      shape = "infer",
      rowValues: rawValues = {},
      requireAllHeaders = false,
      requireOnlyKnownHeaders = false,
      requireSheetIsVisible = false,
    }: BrickArgs<{
      googleAccount?: SanitizedIntegrationConfig | undefined;
      spreadsheetId: string | SanitizedIntegrationConfig;
      tabName: string;
      shape: Shape;
      rowValues: RowValues;
      requireAllHeaders: boolean;
      requireOnlyKnownHeaders: boolean;
      requireSheetIsVisible: boolean;
    }>,
    { logger }: BrickOptions,
  ): Promise<void> {
    if (googleAccount == null) {
      throw new PropError(
        "A Google Configuration is now required. See the migration guide: https://docs.pixiebrix.com/integrations/google-drive/migrating-from-google-sheet-to-google-drive-integration",
        GOOGLE_SHEETS_APPEND_ID,
        "googleAccount",
        googleAccount,
      );
    }

    const spreadsheetId =
      typeof spreadsheetIdArg === "string"
        ? spreadsheetIdArg
        : spreadsheetIdArg.config.spreadsheetId;

    if (spreadsheetId == null) {
      throw new PropError(
        "A Spreadsheet ID is required.",
        GOOGLE_SHEETS_APPEND_ID,
        "spreadsheetId",
        spreadsheetId,
      );
    }

    const target: SpreadsheetTarget = {
      googleAccount,
      spreadsheetId,
      tabName,
    };
    const rows = normalizeShape(shape, rawValues);
    const valueHeaders = uniq(
      rows.flatMap((row) => row.map((x: Entry) => x.header)),
    );

    const spreadsheet = await sheets.getSpreadsheet(target);
    const sheet = spreadsheet.sheets?.find(
      (sheet) => sheet.properties?.title === tabName,
    );

    if (!sheet) {
      logger.info(`Creating tab ${tabName}`);
      await sheets.createTab(target);
    } else if (requireSheetIsVisible && sheet.properties?.hidden) {
      throw new BusinessError(
        `Sheet ${tabName} is hidden. Please unhide the sheet or disable the "Require Visible Sheet" brick config option.`,
      );
    }

    const allRows = await sheets.getAllRows(target);
    let currentSheetHeaders: string[];
    if (allRows.values) {
      currentSheetHeaders = allRows.values[0]?.map(String) ?? [];
      // Trim leading blank columns from current sheet headers
      let firstHeaderIndex = 0;
      while (
        firstHeaderIndex < currentSheetHeaders.length &&
        // eslint-disable-next-line security/detect-object-injection -- firstHeaderIndex is controlled
        isNullOrBlank(currentSheetHeaders[firstHeaderIndex])
      ) {
        firstHeaderIndex++;
      }

      currentSheetHeaders = currentSheetHeaders.slice(firstHeaderIndex);

      if (isEmpty(currentSheetHeaders)) {
        throw new BusinessError(
          "Header row not found. The first row of the sheet must contain header(s).",
        );
      }

      console.debug(
        `Found headers for ${tabName}: ${currentSheetHeaders.join(", ")}`,
      );
    } else {
      logger.info(`Sheet is empty, writing header row for ${tabName}`);
      await sheets.appendRows(target, [valueHeaders]);
      currentSheetHeaders = valueHeaders;
    }

    checkForBlankIntermediateColumns(currentSheetHeaders);

    if (requireAllHeaders) {
      checkForMissingValueHeaders(currentSheetHeaders, valueHeaders);
    }

    if (requireOnlyKnownHeaders) {
      checkAllValueHeadersExist(currentSheetHeaders, valueHeaders);
    }

    await sheets.appendRows(
      target,
      rows.map((row) => makeRowCells(currentSheetHeaders, row)),
    );
  }
}
