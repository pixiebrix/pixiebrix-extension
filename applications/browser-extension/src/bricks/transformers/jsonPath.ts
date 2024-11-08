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

export class JSONPathTransformer extends TransformerABC {
  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/jsonpath",
      "JSONPath",
      "Apply a JSONPath expression: https://github.com/s3u/JSONPath",
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "JSONPath expression",
      },
    },
  };

  async transform(
    { path }: BrickArgs,
    { ctxt }: BrickOptions,
  ): Promise<unknown> {
    const { JSONPath } = await import(
      /* webpackChunkName: "jsonpath-plus" */ "jsonpath-plus"
    );

    // eslint-disable-next-line new-cap -- export from a library
    return JSONPath({ eval: false, path, json: ctxt });
  }
}
