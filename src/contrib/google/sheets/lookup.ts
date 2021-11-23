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

import { validateRegistryId } from "@/types/helpers";
import { Transformer, UnknownObject } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { sheets } from "@/background/messenger/api";
import { propertiesToSchema } from "@/validators/generic";
import { BusinessError } from "@/errors";
import { zip } from "lodash";
import { isNullOrBlank } from "@/utils";

export const GOOGLE_SHEETS_LOOKUP_ID = validateRegistryId(
  "@pixiebrix/google/sheets-lookup"
);

export const LOOKUP_SCHEMA: Schema = propertiesToSchema(
  {
    spreadsheetId: {
      type: "string",
      description: "The ID of the spreadsheet to update.",
    },
    tabName: {
      type: "string",
      description: "The tab name of the spreadsheet to lookup the value.",
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
  ["spreadsheetId", "tabName", "header", "query"]
);

export class GoogleSheetsLookup extends Transformer {
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
    { spreadsheetId, tabName, header, query, multi }: BlockArg,
    { logger }: BlockOptions
  ): Promise<UnknownObject | UnknownObject[]> {
    const response = await sheets.batchGet(spreadsheetId, tabName);

    const headers = response.valueRanges?.[0].values?.[0] ?? [];

    logger.debug(`Tab ${tabName} has headers`, { headers });

    const columnIndex = headers.indexOf(header);
    if (columnIndex < 0) {
      throw new BusinessError(`Header ${header} not found`);
    }

    const rows = response.valueRanges?.[0].values.slice(1);
    // eslint-disable-next-line security/detect-object-injection -- is number
    const matchData = rows.filter((x) => x[columnIndex] === query);
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
