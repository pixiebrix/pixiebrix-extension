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
import { BlockArg, BlockOptions, OutputKey, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import {
  ReduceOptions,
  reducePipelineExpression,
} from "@/runtime/reducePipeline";
import { serializeError } from "serialize-error";
import { PipelineExpression } from "@/runtime/mapArgs";

class TryExcept extends Transformer {
  defaultOutputKey = "result";

  constructor() {
    super(
      "@pixiebrix/try-catch",
      "Try-Except",
      "Try to run a brick, and recover on error"
    );
  }

  override async isPure(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if pure
    return false;
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
    ["try"]
  );

  async transform(
    {
      try: tryPipeline,
      except: exceptPipeline,
      errorKey = validateOutputKey("error"),
    }: BlockArg<{
      try: PipelineExpression;
      except?: PipelineExpression;
      errorKey: OutputKey;
    }>,
    options: BlockOptions
  ): Promise<unknown> {
    // FIXME: fix the types on here
    const reduceOptions = options as unknown as ReduceOptions;

    try {
      return await reducePipelineExpression(
        tryPipeline.__value__,
        options.ctxt,
        options.root,
        reduceOptions
      );
    } catch (error: unknown) {
      const ctxt = {
        ...options.ctxt,
        [`@${errorKey}`]: serializeError(error, { useToJSON: false }),
      };

      return reducePipelineExpression(
        exceptPipeline?.__value__ ?? [],
        ctxt,
        options.root,
        reduceOptions
      );
    }
  }
}

export default TryExcept;
