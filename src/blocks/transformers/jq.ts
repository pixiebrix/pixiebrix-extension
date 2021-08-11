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
import { registerBlock } from "@/blocks/registry";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { isNullOrBlank } from "@/utils";
import { InputValidationError } from "@/blocks/errors";
import { OutputUnit } from "@cfworker/json-schema";
import { isErrorObject } from "@/errors";

export class JQTransformer extends Transformer {
  constructor() {
    super(
      "@pixiebrix/jq",
      "jq - JSON processor",
      "Apply a jq expression: https://stedolan.github.io/jq/",
      "faCode"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      filter: {
        type: "string",
        description: "jq filter expression",
      },
      data: {
        description:
          "The input data, or blank to process the data from the previous step",
      },
    },
    ["filter"]
  );

  async transform(
    { filter, data }: BlockArg,
    { ctxt, logger }: BlockOptions
  ): Promise<unknown> {
    const input = isNullOrBlank(data) ? ctxt : data;

    const jq = (
      await import(
        /* webpackChunkName: "jq-web" */
        // @ts-ignore: no existing definitions exist
        "jq-web"
      )
    ).default;

    logger.debug("Running jq transform", { filter, data, ctxt, input });
    try {
      // eslint-disable-next-line @typescript-eslint/return-await -- Type is `any`, it throws the rule off
      return await jq.promised.json(input, filter);
    } catch (error: unknown) {
      if (isErrorObject(error) && error.message.includes("compile error")) {
        const validationErrors: OutputUnit[] = [
          {
            keyword: "filter",
            keywordLocation: "#/filter",
            instanceLocation: "#",
            error: error.stack,
          },
        ];

        if (error.stack.includes("unexpected $end")) {
          throw new InputValidationError(
            "Unexpected end of jq filter, are you missing a parentheses, brace, and/or quote mark?",
            this.inputSchema,
            { filter, data: input },
            validationErrors
          );
        } else {
          throw new InputValidationError(
            "Invalid jq filter, see error log for details",
            this.inputSchema,
            { filter, data: input },
            validationErrors
          );
        }
      }

      throw error;
    }
  }
}

registerBlock(new JQTransformer());
