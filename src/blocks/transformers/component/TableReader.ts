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

import { Transformer } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { validateRegistryId } from "@/types/helpers";
import parseDomTable, { getAllTables } from "@/utils/parseDomTable";
import { $safeFind } from "@/helpers";

export const TABLE_READER_ID = validateRegistryId("@pixiebrix/table-reader");
export const TABLES_READER_ID = validateRegistryId("@pixiebrix/tables-reader");

export class TableReader extends Transformer {
  constructor() {
    super(TABLE_READER_ID, "Table Reader", "Extract data from table");
  }

  defaultOutputKey = "table";

  required: ["selector"];

  inputSchema: Schema = {
    type: "object",
    required: ["selector"],
    properties: {
      orientation: {
        type: "string",
        enum: ["infer", "vertical", "horizontal"],
        default: "infer",
      },
      selector: {
        type: "string",
        format: "selector",
        description: "CSS/JQuery selector to select the HTML table element",
      },
    },
  };

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      records: {
        description:
          "The records in the table (rows or columns, depending on orientation)",
        type: "array",
        items: { type: "object" },
      },
      fieldNames: {
        description: "The field names in the table",
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["records", "fieldNames"],
    additionalProperties: false,
  };

  async isRootAware(): Promise<boolean> {
    return true;
  }

  async isPure(): Promise<boolean> {
    return true;
  }

  async transform(args: BlockArg, { root }: BlockOptions): Promise<unknown> {
    const $table = $safeFind<HTMLTableElement>(args.selector, root);
    return parseDomTable($table.get(0), { orientation: args.orientation });
  }
}

export class TablesReader extends Transformer {
  constructor() {
    super(
      TABLES_READER_ID,
      "Tables Reader",
      "Extract data from all the tables"
    );
  }

  defaultOutputKey = "tables";

  inputSchema: Schema = {
    type: "object",
    properties: {},
  };

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      tables: {
        description: "The tables found on the page",
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            records: {
              description:
                "The records in the table (rows or columns, depending on orientation)",
              type: "array",
              items: { type: "object" },
            },
            fieldNames: {
              description: "The field names in the table",
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
  };

  async isRootAware(): Promise<boolean> {
    return true;
  }

  async isPure(): Promise<boolean> {
    return true;
  }

  async transform(_: BlockArg, { root }: BlockOptions): Promise<unknown> {
    const tables = Object.fromEntries(getAllTables(root).entries());
    return { tables: Object.keys(tables).length === 0 ? undefined : tables };
  }
}
