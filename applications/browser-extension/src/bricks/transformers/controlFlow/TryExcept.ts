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

import { TransformerABC } from "../../../types/bricks/transformerTypes";
import { validateOutputKey } from "../../../runtime/runtimeTypes";
import { serializeError } from "serialize-error";
import {
  type BrickArgs,
  type BrickOptions,
  type OutputKey,
  type PipelineExpression,
} from "../../../types/runtimeTypes";
import { validateRegistryId } from "../../../types/helpers";
import { type Schema } from "../../../types/schemaTypes";
import { propertiesToSchema } from "../../../utils/schemaUtils";

class TryExcept extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/try-catch");
  override defaultOutputKey = "tryExceptOutput";

  constructor() {
    super(
      TryExcept.BRICK_ID,
      "Try-Except",
      "Try to run a brick, and recover on error",
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
      try: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The bricks to try executing",
      },
      except: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The bricks to run if an error occurs",
      },
      errorKey: {
        type: "string",
        default: "error",
      },
    },
    ["try"],
  );

  async transform(
    {
      try: tryPipeline,
      except: exceptPipeline,
      errorKey = validateOutputKey("error"),
    }: BrickArgs<{
      try: PipelineExpression;
      except?: PipelineExpression;
      errorKey: OutputKey;
    }>,
    options: BrickOptions,
  ): Promise<unknown> {
    try {
      return await options.runPipeline(tryPipeline, {
        key: "try",
        counter: 0,
      });
    } catch (error) {
      options.logger.debug("Caught error", { error });
      if (!exceptPipeline) {
        return;
      }

      return options.runPipeline(
        exceptPipeline,
        { key: "catch", counter: 0 },
        {
          [`@${errorKey}`]: serializeError(error, { useToJSON: false }),
        },
      );
    }
  }
}

export default TryExcept;
