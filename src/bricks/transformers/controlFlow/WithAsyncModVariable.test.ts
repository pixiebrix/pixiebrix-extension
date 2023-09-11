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

import { WithAsyncModVariable } from "@/bricks/transformers/controlFlow/WithAsyncModVariable";
import { makePipelineExpression } from "@/runtime/expressionCreators";
import {
  deferredEchoBrick,
  echoBrick,
  simpleInput,
  testOptions,
  throwBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import blockRegistry from "@/bricks/registry";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import type { Logger } from "@/types/loggerTypes";
import { v4 } from "uuid";
import { getPageState } from "@/contentScript/pageState";
import pDefer from "p-defer";

const withAsyncModVariableBrick = new WithAsyncModVariable();

jest.mock("@/types/helpers", () => ({
  ...jest.requireActual("@/types/helpers"),
  uuidv4: jest.fn(() => v4()),
}));

describe("WithAsyncModVariable", () => {
  let logger: Logger;
  let expectedRequestNonce: string;

  beforeEach(() => {
    blockRegistry.clear();
    blockRegistry.register([echoBrick, throwBrick, withAsyncModVariableBrick]);
    logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });
    expectedRequestNonce = v4();
    (uuidv4 as jest.Mock).mockReturnValue(expectedRequestNonce);
  });

  test("returns request nonce and initializes page state immediately", async () => {
    const pipeline = {
      id: withAsyncModVariableBrick.id,
      config: {
        body: makePipelineExpression([
          {
            id: echoBrick.id,
            config: {
              message: "bar",
            },
          },
        ]),
        stateKey: "foo",
      },
    };

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    const pageState = getPageState({
      namespace: "blueprint",
      extensionId: logger.context.extensionId,
      blueprintId: logger.context.blueprintId,
    });

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expect(pageState).toStrictEqual({
      foo: {
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        currentData: null,
        data: null,
        requestId: null,
        error: null,
      },
    });
  });

  test("returns request nonce and sets page state on success", async () => {
    const pipeline = {
      id: withAsyncModVariableBrick.id,
      config: {
        body: makePipelineExpression([
          {
            id: echoBrick.id,
            config: {
              message: "bar",
            },
          },
        ]),
        stateKey: "foo",
      },
    };

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    await new Promise(process.nextTick);

    const pageState = getPageState({
      namespace: "blueprint",
      extensionId: logger.context.extensionId,
      blueprintId: logger.context.blueprintId,
    });

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expect(pageState).toStrictEqual({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: "bar" },
        data: { message: "bar" },
        requestId: expectedRequestNonce,
        error: null,
      },
    });
  });

  test("returns request nonce and sets page state on error", async () => {
    const pipeline = {
      id: withAsyncModVariableBrick.id,
      config: {
        body: makePipelineExpression([
          {
            id: throwBrick.id,
            config: {
              message: "error",
            },
          },
        ]),
        stateKey: "foo",
      },
    };

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    await new Promise(process.nextTick);

    const pageState = getPageState({
      namespace: "blueprint",
      extensionId: logger.context.extensionId,
      blueprintId: logger.context.blueprintId,
    });

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expect(pageState.foo).toEqual(
      expect.objectContaining({
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        currentData: null,
        data: null,
        requestId: expectedRequestNonce,
        error: expect.objectContaining({
          cause: expect.objectContaining({
            name: "BusinessError",
            message: "error",
          }),
        }),
      })
    );
  });

  test("returns request nonce and sets page state on successful async request", async () => {
    const deferred = pDefer();
    const asyncBrick = deferredEchoBrick(deferred.promise);

    blockRegistry.register([asyncBrick]);

    const pipeline = {
      id: withAsyncModVariableBrick.id,
      config: {
        body: makePipelineExpression([
          {
            id: asyncBrick.id,
            config: {
              message: "bar",
            },
          },
        ]),
        stateKey: "foo",
      },
    };

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    deferred.resolve();

    await new Promise(process.nextTick);

    const pageState = getPageState({
      namespace: "blueprint",
      extensionId: logger.context.extensionId,
      blueprintId: logger.context.blueprintId,
    });

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expect(pageState).toStrictEqual({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: "bar" },
        data: { message: "bar" },
        requestId: expectedRequestNonce,
        error: null,
      },
    });
  });

  test("only sets page state with latest request result; ignores stale requests", async () => {
    const deferredA = pDefer();
    const deferredB = pDefer();

    const asyncBrickA = deferredEchoBrick(deferredA.promise);
    const asyncBrickB = deferredEchoBrick(deferredB.promise);

    blockRegistry.register([asyncBrickA, asyncBrickB]);

    const pipelineA = {
      id: withAsyncModVariableBrick.id,
      config: {
        body: makePipelineExpression([
          {
            id: asyncBrickA.id,
            config: {
              message: "I should not be in page state!",
            },
          },
        ]),
        stateKey: "foo",
      },
    };

    const pipelineB = {
      id: withAsyncModVariableBrick.id,
      config: {
        body: makePipelineExpression([
          {
            id: asyncBrickA.id,
            config: {
              message: "bar",
            },
          },
        ]),
        stateKey: "foo",
      },
    };

    await Promise.all([
      reducePipeline(pipelineA, simpleInput({}), {
        ...testOptions("v3"),
        logger,
      }),
      reducePipeline(pipelineB, simpleInput({}), {
        ...testOptions("v3"),
        logger,
      }),
    ]);

    deferredA.resolve();
    await new Promise(process.nextTick);

    deferredB.resolve();
    await new Promise(process.nextTick);

    const pageState = getPageState({
      namespace: "blueprint",
      extensionId: logger.context.extensionId,
      blueprintId: logger.context.blueprintId,
    });

    expect(pageState).toStrictEqual({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: "bar" },
        data: { message: "bar" },
        requestId: expectedRequestNonce,
        error: null,
      },
    });
  });
});
