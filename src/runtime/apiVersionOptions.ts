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

import { ApiVersion } from "@/core";

/**
 * Options controlled by the apiVersion directive in brick definitions.
 * @see ApiVersion
 */
export type ApiVersionOptions = {
  /**
   * If set to `true`, data only flows via output keys. The last output of the last stage is returned.
   * @since apiVersion 2
   * @since 1.4.0
   */
  explicitDataFlow?: boolean;

  /**
   * The was a hack in older versions to pass primitive values and lists directly to the next block without applying
   * any template engine. (Because originally in PixieBrix there was no way to explicitly pass list variables
   * via outputKeys/variable expressions).
   * @since apiVersion 3
   * @since 1.5.0
   */
  explicitArg?: boolean;

  /**
   * Encode renderers directly in the object instead of a single renderer with implicit behavior for simple paths.
   * @since apiVersion 3
   * @since 1.5.0
   */
  explicitRender?: boolean;

  /**
   * `true` to throw an error if JSON Schema validation fails against the inputSchema for a brick. Logs a warning
   * if the errors don't match the outputSchema (if an outputSchema is provided)
   *
   * Historically input validation was controlled by a `validate` flag in the reducePipeline options, which callers had
   * to remember to provide. We had been enforcing validation since 1.2.0 or potentially even earlier.
   *
   * @since apiVersion 3
   * @since 1.5.0
   */
  validateInput: boolean;
};

/**
 * Return runtime options based on the PixieBrix brick definition API version
 * @see ApiVersionOptions
 */
function apiVersionOptions(version: ApiVersion): ApiVersionOptions {
  switch (version) {
    case "v3": {
      return {
        explicitDataFlow: true,
        explicitArg: true,
        explicitRender: true,
        validateInput: true,
      };
    }

    case "v2": {
      return {
        explicitDataFlow: true,
        explicitArg: false,
        explicitRender: false,
        validateInput: true,
      };
    }

    case "v1":
    default: {
      return {
        explicitDataFlow: false,
        explicitArg: false,
        explicitRender: false,
        validateInput: true,
      };
    }
  }
}

export default apiVersionOptions;
