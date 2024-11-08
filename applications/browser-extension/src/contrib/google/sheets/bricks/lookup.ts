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

import { validateRegistryId } from "../../../../types/helpers";
import { zip } from "lodash";
import { BusinessError, PropError } from "../../../../errors/businessErrors";
import {
  GOOGLE_OAUTH2_PKCE_INTEGRATION_ID,
  SHEET_INTEGRATION_SCHEMA,
} from "../core/schemas";
import { type Schema } from "../../../../types/schemaTypes";
import { TransformerABC } from "../../../../types/bricks/transformerTypes";
import { type SanitizedIntegrationConfig } from "../../../../integrations/integrationTypes";
import { type BrickArgs, type BrickOptions } from "../../../../types/runtimeTypes";
import {
  getAllRows,
  type SpreadsheetTarget,
} from "../core/sheetsApi";
import { isNullOrBlank } from "../../../../utils/stringUtils";

import { INTEGRATIONS_BASE_SCHEMA_URL } from "../../../../integrations/constants";

export const GOOGLE_SHEETS_LOOKUP_ID = validateRegistryId(
  "@pixiebrix/google/sheets-lookup",
);

export const LOOKUP_SCHEMA: Schema = {
  $schema: "https://json-schema.org/draft/2019-09/schema#",
  type: "object",
  properties: {
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
  required: ["spreadsheetId", "tabName"],
  // @since 1.7.40 - header and query are not required if filterRows is false (& present)
  oneOf: [
    {
      required: ["header", "query"],
      properties: {
        filterRows: {
          const: true,
        },
      },
    },
    {
      required: ["filterRows"],
      properties: {
        filterRows: {
          const: false,
        },
      },
    },
  ],
};

type BrickArgsBase = {
  googleAccount?: SanitizedIntegrationConfig | undefined;
  spreadsheetId: string | SanitizedIntegrationConfig;
  tabName: string;
};

type BrickArgsSubTypeA = {
  filterRows?: undefined | true;
  header: string;
  query: string | number | boolean;
  multi: boolean;
};

type BrickArgsSubTypeB = {
  filterRows: false;
  header?: string | undefined;
  query?: string | number | boolean | undefined;
  multi?: boolean | undefined;
};

type BrickArgsType = BrickArgsBase & (BrickArgsSubTypeA | BrickArgsSubTypeB);

export class GoogleSheetsLookup extends TransformerABC {
  constructor() {
    super(
      GOOGLE_SHEETS_LOOKUP_ID,
      "Lookup Google Sheet row",
      "Lookup rows in in a Google Sheet",
    );
  }

  override defaultOutputKey = "row";

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
    }: BrickArgs<BrickArgsType>,
    { logger }: BrickOptions,
  ): Promise<UnknownObject | UnknownObject[]> {
    if (googleAccount == null) {
      throw new PropError(
        "A Google Configuration is now required. See the migration guide: https://docs.pixiebrix.com/integrations/google-drive/migrating-from-google-sheet-to-google-drive-integration",
        GOOGLE_SHEETS_LOOKUP_ID,
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
        GOOGLE_SHEETS_LOOKUP_ID,
        "spreadsheetId",
        spreadsheetId,
      );
    }

    const target: SpreadsheetTarget = {
      googleAccount,
      spreadsheetId,
      tabName,
    };
    const valueRange = await getAllRows(target);
    const [headers = [], ...rows] = valueRange?.values ?? [];

    logger.debug(`Tab ${tabName} has headers`, { headers });

    const returnAllRows = filterRows !== undefined && !filterRows;

    const columnIndex = headers.indexOf(header);
    if (columnIndex < 0 && !returnAllRows) {
      throw new BusinessError(`Header ${header} not found`);
    }

    const matchData = returnAllRows
      ? rows
      : rows.filter((x) => x.at(columnIndex) === query);
    const matchRecords = matchData.map((row) => {
      const entries = zip(headers as string[], row).filter(
        ([rowHeader]) => !isNullOrBlank(rowHeader),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- loose type we don't have control over
      return Object.fromEntries(entries);
    });

    if (multi || returnAllRows) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- loose type we don't have control over
      return matchRecords;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- loose type we don't have control over
    return matchRecords[0];
  }
}
