/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { TransformerABC } from "../../types/bricks/transformerTypes";
import { type BrickArgs, type BrickOptions } from "../../types/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import { InputValidationError } from "../errors";
import { getErrorMessage, isErrorObject } from "../../errors/errorHelpers";
import { BusinessError } from "../../errors/businessErrors";
import { isNullOrBlank } from "../../utils/stringUtils";
import { retryWithJitter } from "../../utils/promiseUtils";
import { type JsonValue } from "type-fest";
import { propertiesToSchema } from "../../utils/schemaUtils";

const jqStacktraceRegexp = /jq: error \(at \/dev\/stdin:0\): (?<message>.*)/;

// https://github.com/fiatjaf/jq-web/issues/32
const JSON_ERROR = "Unexpected end of JSON input";

// https://github.com/fiatjaf/jq-web/issues/31
const GENERIC_ERROR = "generic error, no stack";

// https://github.com/fiatjaf/jq-web/issues/18
const FS_STREAM_ERROR = "FS error";

const MAX_TRANSIENT_ERROR_RETRIES = 3;

/**
 * Return true for jq errors that might be transient.
 *
 * We're excluding FS_STREAM_ERROR because it most likely indicates emscripten has hit the stream limit, so additional
 * retries would not succeed: https://github.com/fiatjaf/jq-web/issues/18
 *
 * JSON_ERROR can be deterministic for filters/data that produce not result set, but we've also seen some error
 * telemetry indicating it might also be transient.
 * See https://www.notion.so/native/pixiebrix/e76066f260494677a2416ed50b4cfba8
 */
function isTransientError(error: unknown): boolean {
  return (
    isErrorObject(error) &&
    (error.message.includes(JSON_ERROR) ||
      error.message.includes(GENERIC_ERROR))
  );
}

type ApplyJqPayload = {
  input: JsonValue;
  filter: string;
};

async function applyJq(payload: ApplyJqPayload): Promise<JsonValue> {
  const { input, filter } = payload;
  const { default: jq } = await import(
    /* webpackChunkName: "jq-web" */
    "@pixiebrix/jq-web"
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Not sure why it's marked as "any"
  return jq.promised.json(input, filter);
}

export class JQTransformer extends TransformerABC {
  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/jq",
      "jq - JSON processor",
      "Apply a jq expression: https://stedolan.github.io/jq/",
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
    ["filter"],
  );

  async transform(
    { filter, data }: BrickArgs,
    { ctxt }: BrickOptions,
  ): Promise<unknown> {
    // This is the legacy behavior, back from runtime v1 when there wasn't explicit data flow.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- TODO: Fix when BrickArgs/BrickOptions return `unknown` instead
    const input = isNullOrBlank(data) ? ctxt : data;

    try {
      return await retryWithJitter(async () => applyJq({ input, filter }), {
        retries: MAX_TRANSIENT_ERROR_RETRIES,
        shouldRetry: isTransientError,
        // Provide just enough jitter that two problematic jq calls don't happen again at the same time
        maxDelayMillis: 25,
      });
    } catch (error) {
      if (isErrorObject(error)) {
        if (error.message.includes(GENERIC_ERROR)) {
          // Give a more user-friendly error message for emscripten stream issues out of the user's control
          // https://github.com/fiatjaf/jq-web/issues/31
          throw new Error("Unable to run jq, try again", { cause: error });
        }

        if (error.message.includes(JSON_ERROR)) {
          // Give a more informative error message for issue cause by the filter/data combination.
          // For example, this error can occur for a `.[]` filter when the data is an empty array.
          throw new BusinessError(
            "Unexpected end of JSON input, ensure the jq filter produces a result for the data",
            { cause: error },
          );
        }

        if (error.message.includes(FS_STREAM_ERROR)) {
          throw new BusinessError("Error opening stream, reload the page");
        }

        if (error.stack) {
          // Prefer the full error message from the stack trace, if available, because jq/emscripten may truncate the
          // message in the thrown error: https://github.com/pixiebrix/pixiebrix-extension/issues/3216
          const stackMatch = jqStacktraceRegexp.exec(error.stack);
          if (stackMatch?.groups?.message) {
            throw new BusinessError(stackMatch.groups.message.trim());
          }
        }

        if (error.message.includes("compile error")) {
          const message = error.stack?.includes("unexpected $end")
            ? "Unexpected end of jq filter, are you missing a parentheses, brace, and/or quote mark?"
            : "Invalid jq filter, see error log for details";

          throw new InputValidationError(
            // The message does not appear to make its way to ErrorItems on the backend
            // FIXME: https://github.com/pixiebrix/pixiebrix-extension/issues/6405
            message,
            this.inputSchema,
            { filter, data: input },
            [
              {
                keyword: "format",
                keywordLocation: "#/properties/filter/format",
                instanceLocation: "#/filter",
                error: error.stack ?? "",
              },
            ],
          );
        }

        // At this point, unless there's a bug in jq itself, it's a business error due to the filter/data combination
        throw new BusinessError(error.message, { cause: error });
      }

      // Report non error-objects as application errors, so we see them in our application error telemetry
      const message = getErrorMessage(error);
      throw new Error(`Error running jq: ${message}`);
    }
  }
}
