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
import { PipelineExpression } from "@/runtime/mapArgs";
import { validateRegistryId } from "@/types/helpers";
import { sleep } from "@/utils";
import { BusinessError } from "@/errors/businessErrors";

class Retry extends Transformer {
  static BLOCK_ID = validateRegistryId("@pixiebrix/retry");
  defaultOutputKey = "retryOutput";

  constructor() {
    super(Retry.BLOCK_ID, "Retry", "Retry bricks on error");
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
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The bricks to execute",
      },
      intervalMillis: {
        type: "number",
        description: "Number of milliseconds to wait between retries",
      },
      maxRetries: {
        type: "number",
        description:
          "The maximum number of retries (not including the initial run)",
        default: 3,
      },
    },
    ["body"]
  );

  async transform(
    {
      body: bodyPipeline,
      maxRetries = Number.MAX_SAFE_INTEGER,
      intervalMillis,
    }: BlockArg<{
      body: PipelineExpression;
      intervalMillis?: number;
      maxRetries?: number;
    }>,
    options: BlockOptions
  ): Promise<unknown> {
    let lastError: unknown;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      if (retryCount > 0) {
        // eslint-disable-next-line no-await-in-loop -- retry loop
        await sleep(intervalMillis);
      }

      try {
        // eslint-disable-next-line no-await-in-loop -- retry loop
        return await options.runPipeline(bodyPipeline.__value__, {
          key: "branch",
          counter: retryCount,
        });
      } catch (error) {
        lastError = error;
      }

      retryCount++;
    }

    if (!lastError) {
      // In practice, lastError will always be set. But throw just in case
      throw new BusinessError("Maximum number of retries exceeded");
    }

    throw lastError;
  }
}

export default Retry;
