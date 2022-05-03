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
import { propertiesToSchema } from "@/validators/generic";
import { isNullOrBlank } from "@/utils";
import { InputValidationError } from "@/blocks/errors";
import { isErrorObject } from "@/errors";

const jqStacktraceRegexp = /jq: error \(at \<stdin\>:0\): (?<message>.*)/;

export class JQTransformer extends Transformer {
  override async isPure(): Promise<boolean> {
    return true;
  }

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

    const { default: jq } =
      // @ts-expect-error no existing definitions exist
      await import(/* webpackChunkName: "jq-web" */ "jq-web");

    logger.debug("Running jq transform", { filter, data, ctxt, input });

    try {
      // eslint-disable-next-line @typescript-eslint/return-await -- Type is `any`, it throws the rule off
      return await jq.promised.json(input, filter);
    } catch (error) {
      // The message length check is there because the JQ error message sometimes is cut and if it is we try to parse the stacktrace
      // See https://github.com/pixiebrix/pixiebrix-extension/issues/3216
      if (
        !isErrorObject(error) ||
        (error.message.length > 13 && !error.message.includes("compile error"))
      ) {
        throw error;
      }

      let message: string;
      if (error.stack.includes("unexpected $end")) {
        message =
          "Unexpected end of jq filter, are you missing a parentheses, brace, and/or quote mark?";
      } else {
        const jqMessageFromStack = jqStacktraceRegexp.exec(error.stack)?.groups
          ?.message;
        if (jqMessageFromStack == null) {
          message = "Invalid jq filter, see error log for details";
        } else {
          message = jqMessageFromStack.trim();
        }
      }

      throw new InputValidationError(
        message,
        this.inputSchema,
        { filter, data: input },
        [
          {
            keyword: "filter",
            keywordLocation: "#/filter",
            instanceLocation: "#",
            error: error.stack,
          },
        ]
      );
    }
  }
}
