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

import type { Brick } from "../../../types/brickTypes";
import type { Expression } from "../../../types/runtimeTypes";
import { toExpression } from "../../../utils/expressionUtils";
import { modComponentRefFactory } from "../../../testUtils/factories/modComponentFactories";
import { getPlatform } from "../../../platform/platformContext";
import { StateNamespaces } from "../../../platform/state/stateTypes";
import { WithCache } from "./WithCache";
import pDefer, { type DeferredPromise } from "p-defer";
import {
  DeferredEchoBrick,
  simpleInput,
  throwBrick,
  echoBrick,
} from "../../../runtime/pipelineTests/testHelpers";
import brickRegistry from "../../registry";
import { TEST_resetStateController } from "../../../contentScript/stateController/stateController";
import { reducePipeline } from "../../../runtime/reducePipeline";
import { reduceOptionsFactory } from "../../../testUtils/factories/runtimeFactories";
import { tick } from "../../../starterBricks/testHelpers";
import { CancelError } from "../../../errors/businessErrors";
import { ContextError } from "../../../errors/genericErrors";
import { sleep } from "../../../utils/timeUtils";

const withCacheBrick = new WithCache();

const STATE_KEY = "testVariable";

function makeCachePipeline(
  brick: Brick,
  {
    message,
    stateKey,
    forceFetch = false,
    ttl = null,
  }: {
    message: string;
    forceFetch?: boolean;
    stateKey: string | Expression;
    ttl?: number | null;
  },
) {
  return {
    id: withCacheBrick.id,
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
      forceFetch,
      ttl,
    },
  };
}

const modComponentRef = modComponentRefFactory();

async function expectPageState(expectedState: UnknownObject): Promise<void> {
  const pageState = await getPlatform().state.getState({
    namespace: StateNamespaces.MOD,
    modComponentRef,
  });

  expect(pageState).toStrictEqual(expectedState);
}

describe("WithCache", () => {
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
      echoBrick,
      withCacheBrick,
    ]);
  });

  it("returns value if pipeline succeeds", async () => {
    const pipeline = makeCachePipeline(echoBrick, {
      stateKey: STATE_KEY,
      message: "bar",
    });

    const brickOutput = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    const expectedData = { message: "bar" };

    expect(brickOutput).toStrictEqual(expectedData);

    await expectPageState({
      [STATE_KEY]: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        data: expectedData,
        currentData: expectedData,
        requestId: expect.toBeString(),
        error: null,
        expiresAt: null,
      },
    });
  });

  it("throws exception if pipeline throws", async () => {
    const pipeline = makeCachePipeline(throwBrick, {
      stateKey: STATE_KEY,
      message: "bar",
    });

    const brickPromise = reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    await expect(brickPromise).rejects.toThrow("bar");
  });

  it("memoizes value", async () => {
    const firstCallPipeline = makeCachePipeline(asyncEchoBrick, {
      stateKey: STATE_KEY,
      message: "first",
    });

    const firstCallPromise = reducePipeline(
      firstCallPipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    // Wait for the initial fetching state to be set
    await tick();

    const secondCallPipeline = makeCachePipeline(asyncEchoBrick, {
      stateKey: STATE_KEY,
      message: "second",
    });

    const secondCallPromise = reducePipeline(
      secondCallPipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    deferred.resolve();

    const target = { message: "first" };

    await expect(firstCallPromise).resolves.toStrictEqual(target);
    await expect(secondCallPromise).resolves.toStrictEqual(target);
  });

  it("respects TTL", async () => {
    const firstCallPipeline = makeCachePipeline(echoBrick, {
      stateKey: STATE_KEY,
      message: "first",
      // Zero seconds to avoid needing to mock timers
      ttl: 0,
    });

    const firstCallPromise = reducePipeline(
      firstCallPipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    // Wait for the initial fetching state to be set
    await tick();

    await sleep(1);

    const secondCallPipeline = makeCachePipeline(asyncEchoBrick, {
      stateKey: STATE_KEY,
      message: "second",
    });

    const secondCallPromise = reducePipeline(
      secondCallPipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    // Wait for 2nd promise to replace the request id
    await tick();

    deferred.resolve();

    try {
      await firstCallPromise;
    } catch (error) {
      expect(error).toBeInstanceOf(ContextError);
      expect((error as Error).cause).toBeInstanceOf(CancelError);
    }

    await expect(secondCallPromise).resolves.toStrictEqual({
      message: "second",
    });
  });

  it("memoizes error", async () => {
    const pipeline = makeCachePipeline(asyncEchoBrick, {
      stateKey: STATE_KEY,
      message: "bar",
    });

    const requesterPromise = reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    // Let the initial isFetching state be set
    await tick();

    const memoizedPromise = reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    deferred.reject(new Error("Test Error"));

    await expect(requesterPromise).rejects.toThrow("Test Error");
    await expect(memoizedPromise).rejects.toThrow("Test Error");
  });

  it("forces fetch", async () => {
    const firstCallPipeline = makeCachePipeline(asyncEchoBrick, {
      stateKey: STATE_KEY,
      message: "first",
    });

    const firstCallPromise = reducePipeline(
      firstCallPipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    // Wait for the initial fetching state to be set
    await tick();

    const secondCallPipeline = makeCachePipeline(asyncEchoBrick, {
      stateKey: STATE_KEY,
      message: "second",
      forceFetch: true,
    });

    const secondCallPromise = reducePipeline(
      secondCallPipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    // Wait for 2nd call to override the request id
    await tick();

    deferred.resolve();

    try {
      await firstCallPromise;
    } catch (error) {
      expect(error).toBeInstanceOf(ContextError);
      expect((error as Error).cause).toBeInstanceOf(CancelError);
    }

    await expect(secondCallPromise).resolves.toStrictEqual({
      message: "second",
    });
  });
});
