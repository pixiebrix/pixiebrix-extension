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

import { Transformer } from "@/types";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { readJQuery, type SelectorMap } from "@/blocks/readers/jquery";
import { type BlockConfig } from "@/blocks/types";
import { mapValues } from "lodash";
import { isExpression } from "@/runtime/mapArgs";

export class JQueryReader extends Transformer {
  constructor() {
    super(
      "@pixiebrix/jquery-reader",
      "Extract from Page",
      "Get data from the page using jQuery selectors"
    );
  }

  defaultOutputKey = "data";

  inputSchema: Schema = {
    type: "object",
    required: ["selectors"],
    properties: {
      selectors: {
        title: "Element selectors",
        type: "object",
        additionalProperties: {
          oneOf: [
            {
              type: "string",
              format: "selector",
            },
            {
              type: "object",
              properties: {
                selector: {
                  type: "string",
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

  override outputSchema: Schema = {
    type: "object",
    additionalProperties: true,
  };

  override getOutputSchema(config: BlockConfig): Schema | undefined {
    const selectors = config.config.selectors as SelectorMap;

    if (isExpression(selectors)) {
      return this.outputSchema;
    }

    return {
      type: "object",
      properties: mapValues(selectors, (value) => {
        if (typeof value === "string") {
          return { type: "string" } as Schema;
        }

        if (value.multi) {
          return { type: "array", items: {} } as Schema;
        }

        return {};
      }),
    };
  }

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
