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
      value: {
        type: "string",
        description: "The value to look up",
      },
      mapping: {
        type: "object",
        description: "The lookup table",
        additionalProperties: { type: "string" },
      },
    },
    required: ["value", "mapping"],
  };

  async transform({ value, mapping }: BlockArg): Promise<string> {
    return mapping[value] ?? value;
  }
}

registerBlock(new MappingTransformer());
