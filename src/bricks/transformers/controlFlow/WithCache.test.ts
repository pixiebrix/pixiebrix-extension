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

import type { Brick } from "@/types/brickTypes";
import type { Expression } from "@/types/runtimeTypes";
import { toExpression } from "@/utils/expressionUtils";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import { getPlatform } from "@/platform/platformContext";
import { StateNamespaces } from "@/platform/state/stateTypes";
import { WithCache } from "@/bricks/transformers/controlFlow/WithCache";
import pDefer, { type DeferredPromise } from "p-defer";
import {
  DeferredEchoBrick,
  simpleInput,
  throwBrick,
  echoBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import brickRegistry from "@/bricks/registry";
import { TEST_resetStateController } from "@/contentScript/stateController/stateController";
import { reducePipeline } from "@/runtime/reducePipeline";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const withCacheBrick = new WithCache();

function makeCachePipeline(
  brick: Brick,
  {
    message,
    stateKey,
  }: {
    message: string;
    stateKey: string | Expression;
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
      echoBrick,
      withCacheBrick,
    ]);
  });

  it("returns value if pipeline succeeds", async () => {
    const pipeline = makeCachePipeline(echoBrick, {
      stateKey: "foo",
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
      foo: {
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
      stateKey: "foo",
      message: "bar",
    });

    const brickPromise = reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    await expect(brickPromise).rejects.toThrow("bar");
  });
});
