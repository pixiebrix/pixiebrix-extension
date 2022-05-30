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
import { BlockArg, Schema } from "@/core";
import { BusinessError } from "@/errors";
import { getOwnProp, hasOwnProp } from "@/utils/safeProps";

export class MappingTransformer extends Transformer {
  defaultOutputKey = "value";

  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/mapping",
      "Mapping",
      "Apply a mapping/lookup table",
      "faCode"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "The value to look up",
      },
      missing: {
        type: "string",
        default: "null",
        enum: ["null", "ignore", "error"],
      },
      mapping: {
        type: "object",
        description: "The lookup table",
        additionalProperties: { type: ["string", "boolean", "number"] },
        minProperties: 1,
      },
    },
    required: ["key", "mapping"],
  };

  async transform({
    key,
    missing = "null",
    mapping,
  }: BlockArg): Promise<unknown> {
    if (key == null || key === "") {
      return null;
    }

    if (hasOwnProp(mapping, key)) {
      return getOwnProp(mapping, key);
    }

    if (missing === "null" || missing === null) {
      return null;
    }

    if (missing === "ignore") {
      return key;
    }

    throw new BusinessError(`Key ${key} not found in the mapping`);
  }
}
