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

import brickRegistry from "@/bricks/registry";
import {
  DeferredEchoBrick,
  echoBrick,
  simpleInput,
  throwBrick,
} from "@/runtime/pipelineTests/testHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import Run from "@/bricks/transformers/controlFlow/Run";
import pDefer from "p-defer";
import { toExpression } from "@/utils/expressionUtils";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const runBlock = new Run();

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([throwBrick, echoBrick, runBlock]);
});

describe("Run", () => {
  test("throws error body fails", async () => {
    const pipeline = {
      id: runBlock.id,
      config: {
        body: toExpression("pipeline", [
          {
            id: throwBrick.id,
            config: {
              message: "This is an error message!",
            },
          },
        ]),
      },
    };

    return expect(
      reducePipeline(pipeline, simpleInput({}), reduceOptionsFactory("v3")),
    ).rejects.toThrow();
  });

  test("returns result on success", async () => {
    const pipeline = {
      id: runBlock.id,
      config: {
        body: toExpression("pipeline", [
          {
            id: echoBrick.id,
            config: {
              message: "Hello, world!",
            },
          },
        ]),
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({
      message: "Hello, world!",
    });
  });

  test("async returns immediately", async () => {
    const deferred = pDefer();
    const asyncBrick = new DeferredEchoBrick(deferred.promise);

    brickRegistry.register([asyncBrick]);
    const pipeline = {
      id: runBlock.id,
      config: {
        async: true,
        body: toExpression("pipeline", [
          {
            id: asyncBrick.id,
            config: {
              message: "Hello, world!",
            },
          },
        ]),
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({});
  });
});
