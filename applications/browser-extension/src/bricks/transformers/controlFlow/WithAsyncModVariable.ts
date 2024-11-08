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
import { uuidv4, validateRegistryId } from "../../../types/helpers";
import { type Schema } from "../../../types/schemaTypes";
import {
  type BrickArgs,
  type BrickOptions,
  type PipelineExpression,
} from "../../../types/runtimeTypes";
import { serializeError } from "serialize-error";
import { type JsonObject } from "type-fest";
import { isNullOrBlank } from "../../../utils/stringUtils";
import { isEmpty } from "lodash";
import { PropError } from "@/errors/businessErrors";
import { type BrickConfig } from "../../types";
import { castTextLiteralOrThrow } from "../../../utils/expressionUtils";
import { propertiesToSchema } from "../../../utils/schemaUtils";
import {
  MergeStrategies,
  StateNamespaces,
} from "../../../platform/state/stateTypes";

/**
 * A brick that stores the result of an asynchronous operation in a Mod Variable.
 *
 * The state shape is defined to be similar to RTK Query and our async hooks:
 * https://redux-toolkit.js.org/rtk-query/api/created-api/hooks#usequery
 */
export class WithAsyncModVariable extends TransformerABC {
  // Brick id matches the existing YAML-defined brick id. The JS brick automatically takes precedence over the
  // user-defined brick if it's available.
  static readonly BRICK_ID = validateRegistryId("@pixies/async");

  constructor() {
    super(
      WithAsyncModVariable.BRICK_ID,
      "Run with Async Mod Variable",
      "Run bricks asynchronously and store the status and result in a Mod Variable",
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
    ["body", "stateKey"],
  );

  override defaultOutputKey = "async";

  override outputSchema: Schema = {
    type: "object",
    properties: {
      requestId: {
        type: "string",
        format: "uuid",
        description:
          "A unique nonce for the run. Can be used to correlate the run with the Mod Variable data.",
      },
    },
    required: ["requestId"],
    additionalProperties: false,
  };

  override async getModVariableSchema(
    _config: BrickConfig,
  ): Promise<Schema | undefined> {
    const { stateKey } = _config.config;

    let name: string | null = null;
    try {
      name = castTextLiteralOrThrow(stateKey);
    } catch {
      return;
    }

    if (name) {
      return {
        type: "object",
        properties: {
          [name]: {
            type: "object",
            properties: {
              isLoading: {
                type: "boolean",
              },
              isFetching: {
                type: "boolean",
              },
              isSuccess: {
                type: "boolean",
              },
              isError: {
                type: "boolean",
              },
              // Consider using `true` instead of `{}`
              currentData: {},
              data: {},
              requestId: {
                type: "string",
                format: "uuid",
              },
              error: {
                type: "object",
              },
            },
            additionalProperties: false,
            required: [
              "isLoading",
              "isFetching",
              "isSuccess",
              "isError",
              "currentData",
              "data",
              "requestId",
              "error",
            ],
          },
        },
        additionalProperties: false,
        required: [name],
      };
    }

    return {
      type: "object",
      additionalProperties: true,
    };
  }

  async transform(
    {
      body,
      stateKey,
    }: BrickArgs<{
      body: PipelineExpression;
      stateKey: string;
    }>,
    { meta: { modComponentRef }, runPipeline, platform }: BrickOptions,
  ) {
    const requestId = uuidv4();

    if (isNullOrBlank(stateKey)) {
      throw new PropError(
        "Mod Variable Name is required",
        this.id,
        "stateKey",
        stateKey,
      );
    }

    const isCurrentNonce = async () => {
      const currentState = await platform.state.getState({
        namespace: StateNamespaces.MOD,
        modComponentRef,
      });

      // eslint-disable-next-line security/detect-object-injection -- user provided value that's readonly
      const currentVariable = (currentState[stateKey] ?? {}) as JsonObject;

      const { requestId: currentRequestId } = currentVariable;

      return currentRequestId == null || currentRequestId === requestId;
    };

    const setModVariable = async (data: JsonObject) => {
      await platform.state.setState({
        // Store as Mod Variable
        namespace: StateNamespaces.MOD,
        modComponentRef,
        // Using shallow will replace the state key, but keep other keys. Always pass the full state object in order
        // to ensure the shape is valid.
        mergeStrategy: MergeStrategies.SHALLOW,
        data: {
          [stateKey]: data,
        },
      });
    };

    // `getState/setState` are async. So calls need to account for interlacing state modifications (including deletes).
    // The main concern is ensuring the shape of the async state is always valid.
    // We don't need to have strong consistency guarantees on which calls "win" if the state is updated concurrently.
    const currentState = await platform.state.getState({
      namespace: StateNamespaces.MOD,
      modComponentRef,
    });

    // eslint-disable-next-line security/detect-object-injection -- user provided value that's readonly
    const currentVariable = (currentState[stateKey] ?? {}) as JsonObject;

    if (isEmpty(currentVariable)) {
      // Initialize the mod variable.
      await setModVariable({
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        currentData: null,
        data: null,
        requestId,
        error: null,
      });
    } else {
      await setModVariable({
        // Preserve the previous data/error, if any. Due to get/setState being async, it's possible that
        // the state could have been deleted since the getState call. Therefore, pass a full state object
        ...currentVariable,
        requestId,
        isFetching: true,
        currentData: null,
      });
    }

    // Non-blocking async call
    (async () => {
      try {
        const data = (await runPipeline(body, {
          key: "body",
          counter: 0,
        })) as JsonObject;

        if (!(await isCurrentNonce())) {
          return;
        }

        await setModVariable({
          isLoading: false,
          isFetching: false,
          isSuccess: true,
          isError: false,
          currentData: data,
          data,
          requestId,
          error: null,
        });
      } catch (error) {
        if (!(await isCurrentNonce())) {
          return;
        }

        await setModVariable({
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: true,
          currentData: null,
          data: null,
          requestId,
          error: serializeError(error) as JsonObject,
        });
      }
    })();

    return {
      requestId,
    };
  }
}
