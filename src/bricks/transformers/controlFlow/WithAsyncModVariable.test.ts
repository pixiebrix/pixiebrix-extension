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

import { WithAsyncModVariable } from "@/bricks/transformers/controlFlow/WithAsyncModVariable";
import {
  DeferredEchoBrick,
  simpleInput,
  throwBrick,
} from "@/runtime/pipelineTests/testHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import brickRegistry from "@/bricks/registry";
import pDefer, { type DeferredPromise } from "p-defer";
import { tick } from "@/starterBricks/testHelpers";
import { type Brick } from "@/types/brickTypes";
import { type UUID } from "@/types/stringTypes";
import { type Expression } from "@/types/runtimeTypes";
import { toExpression } from "@/utils/expressionUtils";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { StateNamespaces } from "@/platform/state/stateTypes";
import { getPlatform } from "@/platform/platformContext";
import { TEST_resetStateController } from "@/contentScript/stateController/stateController";

const withAsyncModVariableBrick = new WithAsyncModVariable();

const makeAsyncModVariablePipeline = (
  brick: Brick,
  message: string,
  stateKey: string | Expression,
) => ({
  id: withAsyncModVariableBrick.id,
  config: {
    body: toExpression("pipeline", [
      {
        id: brick.id,
        config: {
          message,
        },
      },
    ]),
    stateKey,
  },
});

const modComponentRef = modComponentRefFactory();

async function expectPageState(expectedState: UnknownObject): Promise<void> {
  const pageState = await getPlatform().state.getState({
    namespace: StateNamespaces.MOD,
    modComponentRef,
  });

  expect(pageState).toStrictEqual(expectedState);
}

describe("WithAsyncModVariable", () => {
  let deferred: DeferredPromise<void>;
  let asyncEchoBrick: DeferredEchoBrick;

  beforeEach(async () => {
    await TEST_resetStateController();

    // Most tests just require a single brick instance for testing
    deferred = pDefer();
    asyncEchoBrick = new DeferredEchoBrick(deferred.promise);

    brickRegistry.clear();
    brickRegistry.register([
      asyncEchoBrick,
      throwBrick,
      withAsyncModVariableBrick,
    ]);
  });

  test("returns request nonce and initializes page state immediately", async () => {
    const pipeline = makeAsyncModVariablePipeline(asyncEchoBrick, "bar", "foo");

    const brickOutput = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    expect(brickOutput).toStrictEqual({
      requestId: expect.toBeString(),
    });

    await expectPageState({
      foo: {
        // Initializes loading state
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        currentData: null,
        data: null,
        requestId: expect.toBeString(),
        error: null,
      },
    });
  });

  test("returns request nonce and sets page state on success", async () => {
    const pipeline = makeAsyncModVariablePipeline(asyncEchoBrick, "bar", "foo");

    const brickOutput = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    deferred.resolve();
    await tick();

    expect(brickOutput).toStrictEqual({
      requestId: expect.toBeString(),
    });

    await expectPageState({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: "bar" },
        data: { message: "bar" },
        // Shape asserted above
        requestId: (brickOutput as { requestId: UUID }).requestId,
        error: null,
      },
    });
  });

  test("returns request nonce and sets page state on error", async () => {
    const pipeline = makeAsyncModVariablePipeline(throwBrick, "error", "foo");

    const brickOutput = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    await tick();

    expect(brickOutput).toStrictEqual({
      requestId: expect.toBeString(),
    });

    await expectPageState({
      foo: expect.objectContaining({
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        currentData: null,
        data: null,
        // Shape asserted above
        requestId: (brickOutput as { requestId: UUID }).requestId,
        error: expect.objectContaining({
          cause: expect.objectContaining({
            name: "BusinessError",
            message: "error",
          }),
        }),
      }),
    });
  });

  test("only sets page state with latest request result; ignores stale requests", async () => {
    const modVariable = "foo";
    const expectedMessage = "bar";
    const firstDeferred = pDefer();
    const secondDeferred = pDefer();

    const promiseFactory = jest
      .fn()
      .mockReturnValueOnce(firstDeferred.promise)
      .mockReturnValueOnce(secondDeferred.promise);

    // Override the default brick for the test
    const staleAsyncBrick = new DeferredEchoBrick(promiseFactory);
    brickRegistry.register([staleAsyncBrick]);

    const pipeline = makeAsyncModVariablePipeline(
      asyncEchoBrick,
      expectedMessage,
      modVariable,
    );
    const stalePipeline = makeAsyncModVariablePipeline(
      staleAsyncBrick,
      "I shouldn't be in the page state!",
      modVariable,
    );

    await reducePipeline(
      stalePipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    const secondOutput = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    // Neither are resolved, should be in loading state
    await expectPageState({
      foo: {
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        currentData: null,
        data: null,
        requestId: expect.toBeString(),
        error: null,
      },
    });

    secondDeferred.resolve();
    await tick();

    // State should update to be the second request, even though the first request is not completed
    await expectPageState({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: expectedMessage },
        data: { message: expectedMessage },
        // Shape asserted above
        requestId: (secondOutput as { requestId: UUID }).requestId,
        error: null,
      },
    });

    firstDeferred.resolve();
    await tick();

    // State should not update, because the result from the first call is stale
    await expectPageState({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: expectedMessage },
        data: { message: expectedMessage },
        // Shape asserted above
        requestId: (secondOutput as { requestId: UUID }).requestId,
        error: null,
      },
    });
  });

  describe("getModVariableSchema", () => {
    test("with mod variable name set", async () => {
      const pipeline = makeAsyncModVariablePipeline(
        asyncEchoBrick,
        "bar",
        toExpression("nunjucks", "foo"),
      );

      const withAsyncModVariableBrick = new WithAsyncModVariable();

      const actual =
        await withAsyncModVariableBrick.getModVariableSchema(pipeline);

      expect(actual).toStrictEqual({
        type: "object",
        properties: {
          foo: {
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
        required: ["foo"],
      });
    });

    test("with mod variable name unset", async () => {
      const pipeline = makeAsyncModVariablePipeline(
        asyncEchoBrick,
        "bar",
        toExpression("nunjucks", ""),
      );

      const withAsyncModVariableBrick = new WithAsyncModVariable();

      const actual =
        await withAsyncModVariableBrick.getModVariableSchema(pipeline);

      expect(actual).toStrictEqual({
        type: "object",
        additionalProperties: true,
      });
    });
  });
});
