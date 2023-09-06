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

import { validateRegistryId } from "@/types/helpers";
import { sheets } from "@/background/messenger/api";
import { propertiesToSchema } from "@/validators/generic";
import { zip } from "lodash";
import { BusinessError } from "@/errors/businessErrors";
import { SHEET_SERVICE_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import { type Schema } from "@/types/schemaTypes";
import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { type SpreadsheetTarget } from "@/contrib/google/sheets/core/sheetsApi";
import { isNullOrBlank } from "@/utils/stringUtils";

export const GOOGLE_SHEETS_LOOKUP_ID = validateRegistryId(
  "@pixiebrix/google/sheets-lookup"
);

export const LOOKUP_SCHEMA: Schema = propertiesToSchema(
  {
    googleAccount: {
      title: "Google Account",
      oneOf: [
        {
          $ref: "https://app.pixiebrix.com/schemas/services/google/oauth2-pkce",
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
        SHEET_SERVICE_SCHEMA,
      ],
    },
    tabName: {
      type: "string",
      description: "The tab name of the spreadsheet to lookup the value.",
    },
    filterRows: {
      type: "boolean",
      title: "Filter Rows",
      description: "True to show the row filter controls.",
      default: false,
    },
    header: {
      type: "string",
      description: "The header of the column to lookup the value",
    },
    multi: {
      type: "boolean",
      description:
        "True to return all matches, false to return the first match",
      default: false,
    },
    query: {
      type: ["string", "number", "boolean"],
      description: "The value to lookup",
    },
  },
  // For backwards compatibility, googleAccount is not required
  // @since 1.7.40 - header and query are also not required
  ["spreadsheetId", "tabName"]
);

export class GoogleSheetsLookup extends TransformerABC {
  constructor() {
    super(
      GOOGLE_SHEETS_LOOKUP_ID,
      "Lookup Google Sheet row",
      "Lookup rows in in a Google Sheet"
    );
  }

  defaultOutputKey = "row";

  inputSchema: Schema = LOOKUP_SCHEMA;

  async transform(
    {
      googleAccount,
      spreadsheetId: spreadsheetIdArg,
      tabName,
      filterRows,
      header,
      query,
      multi,
    }: BrickArgs<{
      googleAccount?: SanitizedIntegrationConfig | undefined;
      spreadsheetId: string | SanitizedIntegrationConfig;
      tabName: string;
      filterRows?: boolean;
      header: string;
      query: string | number | boolean;
      multi: boolean;
    }>,
    { logger }: BrickOptions
  ): Promise<UnknownObject | UnknownObject[]> {
    const spreadsheetId =
      typeof spreadsheetIdArg === "string"
        ? spreadsheetIdArg
        : spreadsheetIdArg.config.spreadsheetId;
    const target: SpreadsheetTarget = {
      googleAccount,
      spreadsheetId,
      tabName,
    };
    const valueRange = await sheets.getAllRows(target);
    const [headers, ...rows] = valueRange?.values ?? [[], []];

    logger.debug(`Tab ${tabName} has headers`, { headers });

    const returnAllRows = filterRows !== undefined && !filterRows;

    const columnIndex = headers.indexOf(header);
    if (columnIndex < 0 && !returnAllRows) {
      throw new BusinessError(`Header ${header} not found`);
    }

    const matchData = returnAllRows
      ? rows
      : rows.filter((x) => x.at(columnIndex) === query);
    const matchRecords = matchData.map((row) =>
      Object.fromEntries(
        zip(headers, row).filter(([rowHeader]) => !isNullOrBlank(rowHeader))
      )
    );

    if (multi) {
      return matchRecords;
    }

    return matchRecords[0];
  }
}
