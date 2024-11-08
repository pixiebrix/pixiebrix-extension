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
import {
  type BrickArgs,
  type BrickOptions,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import { boolean } from "@/utils/typeUtils";
import { propertiesToSchema } from "@/utils/schemaUtils";

class IfElse extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/if-else");
  override defaultOutputKey = "ifElseOutput";

  constructor() {
    super(
      IfElse.BRICK_ID,
      "If-Else",
      "Run multiple bricks if a condition is met",
    );
  }

  override async isPure(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if pure
    return false;
  }

  override async isRootAware(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if any sub-calls are root aware
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      condition: {
        type: ["string", "boolean", "null", "number"],
        description: "The condition to check",
      },
      if: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The bricks to run if the condition is met",
      },
      else: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The bricks to run if the condition is not met",
      },
    },
    ["if"],
  );

  async transform(
    {
      condition: rawCondition,
      if: ifPipeline,
      else: elsePipeline,
    }: BrickArgs<{
      condition: unknown;
      if: PipelineExpression;
      else?: PipelineExpression;
    }>,
    options: BrickOptions,
  ): Promise<unknown> {
    const condition = boolean(rawCondition);

    if (condition) {
      return options.runPipeline(ifPipeline, {
        key: "if",
        counter: 0,
      });
    }

    if (elsePipeline) {
      return options.runPipeline(elsePipeline, {
        key: "else",
        counter: 0,
      });
    }

    return null;
  }
}

export default IfElse;
