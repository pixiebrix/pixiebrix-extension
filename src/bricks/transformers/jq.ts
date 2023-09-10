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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import { InputValidationError } from "@/bricks/errors";
import { isErrorObject } from "@/errors/errorHelpers";
import { BusinessError } from "@/errors/businessErrors";
import { applyJq } from "@/sandbox/messenger/executor";
import { isNullOrBlank } from "@/utils/stringUtils";
import { retryWithJitter } from "@/bricks/util";

const jqStacktraceRegexp = /jq: error \(at <stdin>:0\): (?<message>.*)/;

// https://github.com/fiatjaf/jq-web/issues/32
const JSON_ERROR = "Unexpected end of JSON input";

// https://github.com/fiatjaf/jq-web/issues/31
const GENERIC_ERROR = "generic error, no stack";

// https://github.com/fiatjaf/jq-web/issues/18
const FS_STREAM_ERROR = "FS error";

export class JQTransformer extends TransformerABC {
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
    { filter, data }: BrickArgs,
    { ctxt }: BrickOptions
  ): Promise<unknown> {
    // This is the legacy behavior, back from runtime v1 when there wasn't explicit data flow.
    const input = isNullOrBlank(data) ? ctxt : data;

    try {
      return await retryWithJitter(
        async () => applyJq({ input, filter }),
        3,
        JSON_ERROR
      );
    } catch (error) {
      if (isErrorObject(error)) {
        if (error.message.includes(GENERIC_ERROR)) {
          // Give a more user-friendly error message for stream issues out of the user's control
          // https://github.com/fiatjaf/jq-web/issues/31
          throw new Error("Unable to run jq, try again", { cause: error });
        }

        if (error.message.includes(JSON_ERROR)) {
          // Give a more informative error message for issue cause by the filter/data
          throw new BusinessError(
            "Unexpected end of JSON input, ensure the jq filter produces a result for the data",
            { cause: error }
          );
        }

        if (error.message.includes(FS_STREAM_ERROR)) {
          throw new BusinessError("Error opening stream, reload the page");
        }
      }

      // The message length check is there because the JQ error message sometimes is cut and if it is we try to parse the stacktrace
      // See https://github.com/pixiebrix/pixiebrix-extension/issues/3216
      if (
        !isErrorObject(error) ||
        (error.message.length > 13 && !error.message.includes("compile error"))
      ) {
        // Unless there's bug in jq itself, if there's an error at this point, it's business error
        if (isErrorObject(error)) {
          throw new BusinessError(error.message, { cause: error });
        }

        throw error;
      }

      // At this point, we know it's a problem with the filter
      const message = error.stack.includes("unexpected $end")
        ? "Unexpected end of jq filter, are you missing a parentheses, brace, and/or quote mark?"
        : jqStacktraceRegexp.exec(error.stack)?.groups?.message?.trim() ??
          "Invalid jq filter, see error log for details";

      throw new InputValidationError(
        // FIXME: this error message does not make its way to ErrorItems on the server
        message,
        this.inputSchema,
        { filter, data: input },
        [
          {
            keyword: "format",
            keywordLocation: "#/properties/filter/format",
            instanceLocation: "#/filter",
            error: error.stack,
          },
        ]
      );
    }
  }
}
