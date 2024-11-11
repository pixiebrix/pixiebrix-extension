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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type BrickArgs } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { BusinessError } from "@/errors/businessErrors";

export class MappingTransformer extends TransformerABC {
  override defaultOutputKey = "value";

  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/mapping",
      "Map/Lookup Value",
      "Apply a mapping/lookup table",
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      key: {
        title: "Key",
        type: "string",
        description: "The key of the value to look up",
      },
      missing: {
        title: "Missing",
        type: "string",
        default: "null",
        enum: ["null", "ignore", "error"],
      },
      mapping: {
        title: "Mapping",
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
  }: BrickArgs<{
    mapping: UnknownObject;
    missing: string;
    key: string | number;
  }>): Promise<unknown> {
    if (key == null || key === "") {
      return null;
    }

    if (Object.hasOwn(mapping, key)) {
      // eslint-disable-next-line security/detect-object-injection -- Checking for hasOwn
      return mapping[key];
    }

    if (missing === "null" || missing == null) {
      return null;
    }

    if (missing === "ignore") {
      return key;
    }

    throw new BusinessError(`Key ${key} not found in the mapping`);
  }
}
