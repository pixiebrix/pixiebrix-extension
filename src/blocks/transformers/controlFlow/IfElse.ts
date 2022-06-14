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
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { boolean } from "@/utils";
import { PipelineExpression } from "@/runtime/mapArgs";
import { validateRegistryId } from "@/types/helpers";

class IfElse extends Transformer {
  static BLOCK_ID = validateRegistryId("@pixiebrix/if-else");
  defaultOutputKey = "ifElseOutput";

  constructor() {
    super(
      IfElse.BLOCK_ID,
      "If-Else",
      "Run multiple bricks if a condition is met"
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
    ["condition", "if"]
  );

  async transform(
    {
      condition: rawCondition,
      if: ifPipeline,
      else: elsePipeline,
    }: BlockArg<{
      condition: unknown;
      if: PipelineExpression;
      else?: PipelineExpression;
    }>,
    options: BlockOptions
  ): Promise<unknown> {
    const condition = boolean(rawCondition);

    if (condition) {
      return options.runPipeline(ifPipeline.__value__ ?? [], {
        key: "if",
        counter: 0,
      });
    }

    return options.runPipeline(elsePipeline?.__value__ ?? [], {
      key: "else",
      counter: 0,
    });
  }
}

export default IfElse;
