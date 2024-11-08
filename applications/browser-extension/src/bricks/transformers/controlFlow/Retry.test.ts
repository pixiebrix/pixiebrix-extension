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

import brickRegistry from "../../registry";
import {
  echoBrick,
  simpleInput,
  throwBrick,
} from "../../../runtime/pipelineTests/testHelpers";
import { reducePipeline } from "../../../runtime/reducePipeline";
import Retry from "./Retry";
import { toExpression } from "../../../utils/expressionUtils";
import { reduceOptionsFactory } from "../../../testUtils/factories/runtimeFactories";

const retryBlock = new Retry();

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([throwBrick, echoBrick, retryBlock]);
});

describe("Retry", () => {
  test("throws error if retries fail", async () => {
    const pipeline = {
      id: retryBlock.id,
      config: {
        maxRetries: 2,
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
      id: retryBlock.id,
      config: {
        maxRetries: 2,
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
});
