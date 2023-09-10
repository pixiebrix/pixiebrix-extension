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
import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import { setPageState } from "@/contentScript/pageState";
import {
  type BrickArgs,
  type BrickOptions,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { serializeError } from "serialize-error";
import { type JsonObject } from "type-fest";

/**
 * A brick that stores the result of an asynchronous operation in a Mod Variable.
 *
 * The state shape is defined to be similar to RTK Query and our async hooks.
 */
export class WithAsyncModVariable extends TransformerABC {
  // Brick id matches the YAML-defined brick id
  static readonly BRICK_ID = validateRegistryId("@pixies/util/use-async-state");

  constructor() {
    super(
      WithAsyncModVariable.BRICK_ID,
      "With Async Mod Variable",
      "Track an asynchronous operation with a Mod Variable"
    );
  }

  override async isPure(): Promise<boolean> {
    // Modifies the Page State
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        title: "Body",
        description: "The bricks to run asynchronously",
      },
      stateKey: {
        title: "Mod Variable Name",
        type: "string",
        description: "The Mod Variable to store the status and data in",
      },
    },
    ["body", "stateKey"]
  );

  // This brick is a Transformer with an output key for backward-compatability. It produces no output, but was defined
  // as a user-defined brick previously, so it had an output key.
  defaultOutputKey = "async";

  override outputSchema: Schema = {
    type: "object",
    properties: {},
    additionalProperties: false,
  };

  async transform(
    {
      body,
      stateKey,
    }: BrickArgs<{
      body: PipelineExpression;
      stateKey: string;
    }>,
    { logger, runPipeline }: BrickOptions
  ) {
    const { blueprintId, extensionId } = logger.context;

    const set = (data: JsonObject, strategy: "put" | "patch") => {
      setPageState({
        // Store as Mod Variable
        namespace: "blueprint",
        data: {
          [stateKey]: data,
        },
        // Using shallow will replace the state key, but keep other keys
        mergeStrategy: strategy === "put" ? "shallow" : "deep",
        extensionId,
        blueprintId,
      });
    };

    set(
      {
        isFetching: true,
        currentData: null,
      },
      "patch"
    );

    const bodyPromise = runPipeline(body, {
      key: "body",
      counter: 0,
    });

    // eslint-disable-next-line promise/prefer-await-to-then -- not blocking
    void bodyPromise
      .then((data: JsonObject) => {
        set(
          {
            isFetching: false,
            currentData: data,
            data,
            isSuccess: true,
            isError: false,
            error: null,
          },
          "put"
        );
        // eslint-disable-next-line promise/prefer-await-to-then -- not blocking
      })
      .catch((error) => {
        set(
          {
            isFetching: false,
            currentData: null,
            data: null,
            isSuccess: true,
            isError: false,
            error: serializeError(error),
          },
          "put"
        );
      });

    // Match the return value of the `@pixiebrix/run` brick in async mode
    return {};
  }
}
