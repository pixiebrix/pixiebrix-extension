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
  type DeferredEchoBrick,
  deferredEchoBrick,
  simpleInput,
  testOptions,
  type ThrowBrick,
  throwBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import blockRegistry from "@/bricks/registry";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import type { Logger } from "@/types/loggerTypes";
import { v4 } from "uuid";
import { getPageState, setPageState } from "@/contentScript/pageState";
import pDefer, { type DeferredPromise } from "p-defer";
import { tick } from "@/starterBricks/starterBrickTestUtils";

const withAsyncModVariableBrick = new WithAsyncModVariable();

jest.mock("@/types/helpers", () => ({
  ...jest.requireActual("@/types/helpers"),
  uuidv4: jest.fn(() => v4()),
}));

const makeAsyncModVariablePipeline = (
  brick: DeferredEchoBrick | ThrowBrick,
  message: string,
  stateKey: string
) => ({
  id: withAsyncModVariableBrick.id,
  config: {
    body: makePipelineExpression([
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

describe("WithAsyncModVariable", () => {
  let logger: Logger;
  let expectedRequestNonce: string;
  let deferred: DeferredPromise<void>;
  let asyncEchoBrick: DeferredEchoBrick;
  let expectPageState: (expectedState: any) => void;

  beforeEach(() => {
    deferred = pDefer();
    asyncEchoBrick = deferredEchoBrick(deferred.promise);

    blockRegistry.clear();
    blockRegistry.register([
      asyncEchoBrick,
      throwBrick,
      withAsyncModVariableBrick,
    ]);

    logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });

    expectedRequestNonce = v4();
    (uuidv4 as jest.Mock).mockReturnValue(expectedRequestNonce);

    // Reset the page state
    setPageState({
      namespace: "blueprint",
      data: {},
      mergeStrategy: "deep",
      extensionId: logger.context.extensionId,
      blueprintId: logger.context.blueprintId,
    });

    expectPageState = (expectedState: any) => {
      const pageState = getPageState({
        namespace: "blueprint",
        extensionId: logger.context.extensionId,
        blueprintId: logger.context.blueprintId,
      });
      expect(pageState).toStrictEqual(expectedState);
    };
  });

  test("returns request nonce and initializes page state immediately", async () => {
    const pipeline = makeAsyncModVariablePipeline(asyncEchoBrick, "bar", "foo");

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expectPageState({
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
    const pipeline = makeAsyncModVariablePipeline(asyncEchoBrick, "bar", "foo");

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    deferred.resolve();
    await tick();

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expectPageState({
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
    const pipeline = makeAsyncModVariablePipeline(throwBrick, "error", "foo");

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    await tick();

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expectPageState({
      foo: expect.objectContaining({
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
      }),
    });
  });

  test("returns request nonce and sets page state on successful async request", async () => {
    const pipeline = makeAsyncModVariablePipeline(asyncEchoBrick, "bar", "foo");

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    deferred.resolve();

    await tick();

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expectPageState({
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
    const staleDeferred = pDefer();
    const staleAsyncBrick = deferredEchoBrick(staleDeferred.promise);

    blockRegistry.register([staleAsyncBrick]);

    const pipeline = makeAsyncModVariablePipeline(asyncEchoBrick, "bar", "foo");
    const stalePipeline = makeAsyncModVariablePipeline(
      staleAsyncBrick,
      "I shouldn't be in the page state!",
      "foo"
    );

    const staleRequestNonce = expectedRequestNonce;
    const staleOutput = await reducePipeline(stalePipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    expect(staleOutput).toStrictEqual({
      requestId: staleRequestNonce,
    });

    const latestRequestNonce = v4();
    (uuidv4 as jest.Mock).mockReturnValue(latestRequestNonce);

    const latestOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    expect(latestOutput).toStrictEqual({
      requestId: latestRequestNonce,
    });

    deferred.resolve();
    await tick();

    expectPageState({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: "bar" },
        data: { message: "bar" },
        requestId: latestRequestNonce,
        error: null,
      },
    });

    staleDeferred.resolve();
    await tick();

    expectPageState({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: "bar" },
        data: { message: "bar" },
        requestId: latestRequestNonce,
        error: null,
      },
    });
  });
});
