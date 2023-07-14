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

import blockRegistry from "@/bricks/registry";
import {
  simpleInput,
  teapotBrick,
  testOptions,
  throwBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import TryExcept from "@/bricks/transformers/controlFlow/TryExcept";
import { makePipelineExpression } from "@/runtime/expressionCreators";

const tryExceptBlock = new TryExcept();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register([teapotBrick, throwBrick, tryExceptBlock]);
});

describe("TryExcept", () => {
  test("try branch", async () => {
    const pipeline = {
      id: tryExceptBlock.id,
      config: {
        try: makePipelineExpression([{ id: teapotBrick.id, config: {} }]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ prop: "I'm a teapot" });
  });

  test("except branch", async () => {
    const pipeline = {
      id: tryExceptBlock.id,
      config: {
        try: makePipelineExpression([{ id: throwBrick.id, config: {} }]),
        except: makePipelineExpression([{ id: teapotBrick.id, config: {} }]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ prop: "I'm a teapot" });
  });

  test("except optional", async () => {
    const pipeline = {
      id: tryExceptBlock.id,
      config: {
        // Throw to make it more obvious if wrong branch taken
        try: makePipelineExpression([{ id: throwBrick.id, config: {} }]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual(null);
  });
});
