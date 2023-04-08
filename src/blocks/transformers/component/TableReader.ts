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

import { Transformer } from "@/types/blocks/transformerTypes";
import { type BlockArg, type BlockOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import { parseDomTable, getAllTables } from "@/utils/parseDomTable";
import {
  parseDefinitionList,
  getAllDefinitionLists,
} from "@/utils/parseDefinitionList";
import { findSingleElement } from "@/utils/requireSingleElement";
import { lowerCase } from "lodash";

const TABLE_READER_ID = validateRegistryId("@pixiebrix/table-reader");
const TABLE_READER_ALL_ID = validateRegistryId("@pixiebrix/table-reader-all");

export class TableReader extends Transformer {
  constructor() {
    super(TABLE_READER_ID, "Table Reader", "Extract data from table");
  }

  defaultOutputKey = "table";

  inputSchema: Schema = {
    type: "object",
    required: [],
    properties: {
      orientation: {
        type: "string",
        enum: ["infer", "vertical", "horizontal"],
        default: "infer",
      },
      selector: {
        type: "string",
        title: "Element selector",
        format: "selector",
        description: "CSS/jQuery selector to select the HTML table element",
      },
    },
  };

  override outputSchema: Schema = {
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

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  async transform(
    { selector, orientation = "infer" }: BlockArg,
    { root }: BlockOptions
  ): Promise<unknown> {
    const table = selector ? findSingleElement(selector, root) : root;

    if (table instanceof HTMLDListElement) {
      return parseDefinitionList(table);
    }

    if (table instanceof HTMLTableElement) {
      return parseDomTable(table, { orientation });
    }

    throw new TypeError(
      `Selector does not match a table or definition list (dl) element, found: <${lowerCase(
        table.nodeName
      )}>`
    );
  }
}

export class TablesReader extends Transformer {
  constructor() {
    super(
      TABLE_READER_ALL_ID,
      "Read All Tables",
      "Extract data from all the tables on the page"
    );
  }

  defaultOutputKey = "tables";

  inputSchema: Schema = {
    type: "object",
    properties: {},
  };

  override outputSchema: Schema = {
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
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  async transform(_: BlockArg, { root }: BlockOptions): Promise<unknown> {
    return Object.fromEntries([
      ...getAllTables(root).entries(),
      ...getAllDefinitionLists(root).entries(),
    ]);
  }
}
