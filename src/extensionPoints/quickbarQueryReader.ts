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

import { Reader } from "@/types/blocks/readerTypes";
import { type JsonObject } from "type-fest";
import { type Schema } from "@/types/schemaTypes";

/**
 * A reader "stub" for dynamic Quick Bar query.
 *
 * The data for the output scheme is filled by the dynamic Quick Bar.
 */
export class QuickbarQueryReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/quickbar/query",
      "Quick Bar Query",
      "Data from the current Quick Bar query"
    );
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async read(): Promise<JsonObject> {
    // The actual field is set by the extension point, not the reader, because it's made available
    // by the browser API in the menu handler
    throw new Error("QuickbarQueryReader.read() should not be called directly");
  }

  override outputSchema: Schema = {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The current query string in the Quick Bar",
      },
    },
  };
}

export const quickbarQueryReaderShim = {
  isAvailable: async () => true,

  outputSchema: new QuickbarQueryReader().outputSchema,

  async read() {
    return {
      query: "Quick Bar query placeholder",
    };
  },
};
