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

import { Transformer } from "@/types/blocks/transformerTypes";
import { type BlockArgs, type BlockOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import {
  $safeFindElementsWithRootMode,
  IS_ROOT_AWARE_BRICK_PROPS,
} from "@/blocks/rootModeHelpers";

export class DetectElement extends Transformer {
  defaultOutputKey = "match";

  constructor() {
    super(
      "@pixiebrix/dom/detect",
      "Detect an element on a page",
      "Detect and/or count an element using a jQuery selector"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      selector: {
        type: "string",
        description: "jQuery selector",
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    ["selector"]
  );

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      exists: {
        type: "boolean",
        description: "True if the element was detected",
      },
      count: {
        type: "number",
        description: "The number of matches",
      },
    },
    required: ["exists", "count"],
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async transform(
    { selector, isRootAware }: BlockArgs,
    { root }: BlockOptions
  ): Promise<Record<string, unknown>> {
    const $result = $safeFindElementsWithRootMode({
      selector,
      isRootAware,
      root,
      blockId: this.id,
    });
    return {
      count: $result.length,
      exists: $result.length > 0,
    };
  }
}
