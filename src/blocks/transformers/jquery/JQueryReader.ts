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

import { Transformer } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { readJQuery, SelectorMap } from "@/blocks/readers/jquery";

export class JQueryReader extends Transformer {
  constructor() {
    super(
      "@pixiebrix/jquery-reader",
      "jQuery Selector Reader",
      "Extract data via one or more jQuery selectors"
    );
  }

  defaultOutputKey = "data";

  inputSchema: Schema = {
    type: "object",
    required: ["selectors"],
    properties: {
      selectors: {
        type: "object",
        additionalProperties: {
          oneOf: [
            {
              type: "string",
              description: "A jQuery selector",
              format: "selector",
            },
            {
              type: "object",
              properties: {
                selector: {
                  type: "string",
                  description: "A jQuery selector",
                  format: "selector",
                },
                multi: {
                  type: "boolean",
                  description: "True to read multiple elements as an array",
                  default: false,
                },
                data: {
                  type: "string",
                  description: "The data-* attribute to read",
                },
                attr: {
                  type: "string",
                  description: "The HTML attribute to read",
                },
                type: {
                  type: "string",
                  description: "Data type to cast the result to",
                  enum: ["string", "boolean", "number"],
                },
                find: {
                  type: "object",
                  description: "Sub-element selectors relative to selector",
                  additionalProperties: true,
                  minProperties: 1,
                },
              },
            },
          ],
        },
      },
    },
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  async transform(
    { selectors }: BlockArg<{ selectors: SelectorMap }>,
    { root }: BlockOptions
  ): Promise<unknown> {
    return readJQuery({ type: "jquery", selectors }, root);
  }
}
