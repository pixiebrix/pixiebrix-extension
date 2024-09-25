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
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import {
  type BrickArgs,
  type BrickOptions,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { deserializeError, serializeError } from "serialize-error";
import { type JsonObject } from "type-fest";
import { isNullOrBlank } from "@/utils/stringUtils";
import { isEmpty } from "lodash";
import { BusinessError, CancelError, PropError } from "@/errors/businessErrors";
import { type BrickConfig } from "@/bricks/types";
import { castTextLiteralOrThrow } from "@/utils/expressionUtils";
import { propertiesToSchema } from "@/utils/schemaUtils";
import {
  MergeStrategies,
  STATE_CHANGE_JS_EVENT_TYPE,
  StateNamespaces,
} from "@/platform/state/stateTypes";
import { ContextError } from "@/errors/genericErrors";
import pDefer from "p-defer";
import type { UUID } from "@/types/stringTypes";

type Args = {
  body: PipelineExpression;
  stateKey: string;
  ttl?: number;
  forceFetch?: boolean;
};

type CacheVariableState = {
  requestId: UUID;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: JsonObject | null;
  data: JsonObject;
  expiresAt: number | null;
};

function isCacheVariableState(value: unknown): value is CacheVariableState {
  if (typeof value !== "object" || value == null) {
    return false;
  }

  const { requestId, isFetching, isError, expiresAt } = value as UnknownObject;

  if (typeof isFetching !== "boolean") {
    return false;
  }

  if (typeof isError !== "boolean") {
    return false;
  }

  if (typeof requestId !== "string") {
    return false;
  }

  if (expiresAt != null && typeof expiresAt !== "number") {
    return false;
  }

  return true;
}

/**
 * A brick that runs synchronously and caches the result in a Mod Variable. Repeat calls are memoized until settled.
 *
 * The state shape is defined to be similar to RTK Query and our async hooks:
 * https://redux-toolkit.js.org/rtk-query/api/created-api/hooks#usequery
 */
export class WithCache extends TransformerABC {
  static readonly BRICK_ID = validateRegistryId("@pixiebrix/cache");

  constructor() {
    super(
      WithCache.BRICK_ID,
      "Run with Cache",
      "Run bricks synchronously and cache the status and result in a Mod Variable",
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
      ttl: {
        title: "Time-to-Live (s)",
        type: "integer",
        description:
          "The time-to-live for the cached value in seconds. Expiry is calculated from the start of the run.",
      },
      forceFetch: {
        title: "Force Fetch",
        type: "boolean",
        description:
          "If true, the cache will be ignored and the body always be run.",
      },
    },
    ["body", "stateKey"],
  );

  override defaultOutputKey = "cachedValue";

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
              currentData: {},
              data: {},
              expiresAt: {
                type: "integer",
              },
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

  private async waitForSettledRequest({
    requestId,
    args: { stateKey },
    options,
  }: {
    requestId: string;
    args: BrickArgs<Args>;
    options: BrickOptions;
  }): Promise<unknown> {
    // Coalesce multiple requests into a single request
    const {
      meta: { modComponentRef },
      platform,
      abortSignal,
    } = options;

    const deferredValuePromise = pDefer<unknown>();

    document.addEventListener(
      STATE_CHANGE_JS_EVENT_TYPE,
      async () => {
        const stateUpdate = await platform.state.getState({
          namespace: StateNamespaces.MOD,
          modComponentRef,
        });

        // eslint-disable-next-line security/detect-object-injection -- user provided value that's readonly
        const variableUpdate = (stateUpdate[stateKey] ?? {}) as JsonObject;

        if (!isCacheVariableState(variableUpdate)) {
          deferredValuePromise.reject(
            new BusinessError(
              "Invalid cache shape. Cache value was overwritten.",
            ),
          );
        }

        if (variableUpdate.requestId !== requestId) {
          // XXX: should this be a CancelError?
          deferredValuePromise.reject(
            new CancelError("Value generation was superseded"),
          );
        }

        if (!variableUpdate.isFetching) {
          if (variableUpdate.isError) {
            deferredValuePromise.reject(deserializeError(variableUpdate.error));
          }

          deferredValuePromise.resolve(variableUpdate.data);
        }

        // Ignore state change if still fetching
      },
      { signal: abortSignal },
    );

    return deferredValuePromise.promise;
  }

  private async generateValue({
    currentVariable,
    args: { stateKey, ttl, body },
    options,
  }: {
    currentVariable: CacheVariableState | null;
    args: BrickArgs<Args>;
    options: BrickOptions;
  }): Promise<unknown> {
    // Perform a new request
    const requestId = uuidv4();
    const expiresAt = ttl == null ? null : Date.now() + ttl * 1000;

    const {
      meta: { modComponentRef },
      runPipeline,
      platform,
    } = options;

    const isCurrentNonce = async (query: string) => {
      const currentState = await platform.state.getState({
        namespace: StateNamespaces.MOD,
        modComponentRef,
      });

      // eslint-disable-next-line security/detect-object-injection -- user provided value that's readonly
      const currentVariable = (currentState[stateKey] ?? {}) as JsonObject;

      const { requestId: currentRequestId } = currentVariable;

      return currentRequestId == null || currentRequestId === query;
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

    if (currentVariable == null) {
      // Initialize the mod variable.
      await setModVariable({
        requestId,
        expiresAt,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        currentData: null,
        data: null,
        error: null,
      });
    } else {
      await setModVariable({
        // Preserve the previous data/error, if any. Due to get/setState being async, it's possible that
        // the state could have been deleted since the getState call. Therefore, pass a full state object
        ...currentVariable,
        requestId,
        expiresAt,
        isFetching: true,
        currentData: null,
      });
    }

    let data: JsonObject;

    try {
      data = (await runPipeline(body, {
        key: "body",
        counter: 0,
      })) as JsonObject;
    } catch (_error) {
      if (!(await isCurrentNonce(requestId))) {
        throw new CancelError("Value generation was superseded");
      }

      await setModVariable({
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        currentData: null,
        data: null,
        requestId,
        error: serializeError(_error) as JsonObject,
      });

      throw new ContextError("An error occurred generating the cached value", {
        cause: _error,
      });
    }

    if (!(await isCurrentNonce(requestId))) {
      throw new CancelError("Value generation was superseded");
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
      expiresAt,
    });

    return data;
  }

  async transform(args: BrickArgs<Args>, options: BrickOptions) {
    const { stateKey, forceFetch = false } = args;

    const {
      meta: { modComponentRef },
      platform,
    } = options;

    if (isNullOrBlank(stateKey)) {
      throw new PropError(
        "Mod Variable Name is required",
        this.id,
        "stateKey",
        stateKey,
      );
    }

    // `getState/setState` are async. So calls need to account for interlacing state modifications (including deletes).
    // The main concern is ensuring the shape of the async state is always valid.
    // We don't need to have strong consistency guarantees on which calls "win" if the state is updated concurrently.
    const currentState = await platform.state.getState({
      namespace: StateNamespaces.MOD,
      modComponentRef,
    });

    // eslint-disable-next-line security/detect-object-injection -- user provided value that's readonly
    const currentVariable = (currentState[stateKey] ?? {}) as JsonObject;

    if (!isEmpty(currentVariable) && !isCacheVariableState(currentVariable)) {
      throw new BusinessError(
        "Invalid cache shape. Cache value was overwritten.",
      );
    }

    if (isCacheVariableState(currentVariable) && currentVariable.isFetching) {
      return this.waitForSettledRequest({
        requestId: currentVariable.requestId,
        args,
        options,
      });
    }

    if (
      !forceFetch &&
      isCacheVariableState(currentVariable) &&
      // Don't throw settled exceptions/rejections
      currentVariable.isSuccess &&
      // Only refetch if the cached value is still valid w.r.t. the TTL
      (currentVariable.expiresAt == null ||
        Date.now() < currentVariable.expiresAt)
    ) {
      return currentVariable.data;
    }

    return this.generateValue({
      currentVariable: isCacheVariableState(currentVariable)
        ? currentVariable
        : null,
      args,
      options,
    });
  }
}
