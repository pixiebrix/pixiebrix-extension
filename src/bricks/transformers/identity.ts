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
import { type BrickArgs } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import { type BrickConfig } from "@/bricks/types";
import { isPlainObject, mapValues } from "lodash";
import { isExpression } from "@/utils/expressionUtils";

export class IdentityTransformer extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/identity");

  override async isPure(): Promise<boolean> {
    return true;
  }

  override getOutputSchema(_config: BrickConfig): Schema | undefined {
    if (isPlainObject(_config.config) && !isExpression(_config.config)) {
      return {
        type: "object",
        // Allow any under each property
        properties: mapValues(_config.config, () => ({})),
        required: Object.keys(_config.config),
      };
    }

    if (Array.isArray(_config.config)) {
      return {
        type: "array",
        items: {},
      };
    }

    return undefined;
  }

  constructor() {
    super(
      IdentityTransformer.BRICK_ID,
      "Identity Function",
      "Returns/echoes the value passed into it. Use to construct return values/event data.",
      "faCode"
    );
  }

  // Empty schema matches any input
  inputSchema: Schema = {
    title: "Value",
  };

  async transform(arg: BrickArgs): Promise<BrickArgs> {
    return arg;
  }
}
