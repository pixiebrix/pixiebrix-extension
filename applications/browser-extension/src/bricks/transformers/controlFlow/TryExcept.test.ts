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
  simpleInput,
  teapotBrick,
  throwBrick,
} from "../../../runtime/pipelineTests/testHelpers";
import { reducePipeline } from "../../../runtime/reducePipeline";
import TryExcept from "./TryExcept";

import { toExpression } from "../../../utils/expressionUtils";
import { reduceOptionsFactory } from "../../../testUtils/factories/runtimeFactories";

const tryExceptBlock = new TryExcept();

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([teapotBrick, throwBrick, tryExceptBlock]);
});

describe("TryExcept", () => {
  test("try branch", async () => {
    const pipeline = {
      id: tryExceptBlock.id,
      config: {
        try: toExpression("pipeline", [{ id: teapotBrick.id, config: {} }]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({ prop: "I'm a teapot" });
  });

  test("except branch", async () => {
    const pipeline = {
      id: tryExceptBlock.id,
      config: {
        try: toExpression("pipeline", [{ id: throwBrick.id, config: {} }]),
        except: toExpression("pipeline", [{ id: teapotBrick.id, config: {} }]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({ prop: "I'm a teapot" });
  });

  test("except optional", async () => {
    const pipeline = {
      id: tryExceptBlock.id,
      config: {
        // Throw to make it more obvious if wrong branch taken
        try: toExpression("pipeline", [{ id: throwBrick.id, config: {} }]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );
    expect(result).toBeUndefined();
  });
});
