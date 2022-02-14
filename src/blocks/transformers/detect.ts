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
import { propertiesToSchema } from "@/validators/generic";
import { $safeFind } from "@/helpers";

export class DetectElement extends Transformer {
  defaultOutputKey = "match";

  constructor() {
    super(
      "@pixiebrix/dom/detect",
      "Detect an element on a page",
      "Detect and/or count an element on a page from a JQuery selector"
    );
  }

  inputSchema: Schema = propertiesToSchema({
    selector: {
      type: "string",
      description: "JQuery selector",
    },
  });

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

  async transform({ selector }: BlockArg): Promise<Record<string, unknown>> {
    const $result = $safeFind(selector);
    return {
      count: $result.length,
      exists: $result.length > 0,
    };
  }
}
