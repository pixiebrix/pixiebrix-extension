/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Transformer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

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
    const input = (data ?? "").trim() !== "" ? data : ctxt;

    const jq = (
      await import(
        /* webpackChunkName: "jq-web" */
        // @ts-ignore: no existing definitions exist
        "jq-web"
      )
    ).default;

    logger.debug("Running jq transform", { filter, data, ctxt, input });
    return await jq.promised.json(input, filter);
  }
}

registerBlock(new JQTransformer());
