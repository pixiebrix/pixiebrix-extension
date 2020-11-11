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
import { BlockArg, Schema } from "@/core";

export class MappingTransformer extends Transformer {
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
        additionalProperties: { type: "string" },
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
    if (key == null) {
      return null;
    } else if (Object.prototype.hasOwnProperty.call(mapping, key)) {
      return mapping[key];
    } else if (missing === "null" || missing === null) {
      return null;
    } else if (missing === "ignore") {
      return key;
    } else if (missing === "error") {
      throw new Error(`Key ${key} not found in the mapping`);
    }
  }
}

registerBlock(new MappingTransformer());
