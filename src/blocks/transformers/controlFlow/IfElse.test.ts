/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import blockRegistry from "@/blocks/registry";
import {
  simpleInput,
  teapotBlock,
  testOptions,
  throwBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import IfElse from "@/blocks/transformers/controlFlow/IfElse";
import { reducePipeline } from "@/runtime/reducePipeline";
import * as logging from "@/background/messenger/api";
import { makePipelineExpression } from "@/testUtils/expressionTestHelpers";

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

const ifElseBlock = new IfElse();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(teapotBlock, throwBlock, ifElseBlock);
});

describe("IfElse", () => {
  test("if branch", async () => {
    const pipeline = {
      id: ifElseBlock.id,
      config: {
        condition: true,
        if: makePipelineExpression([{ id: teapotBlock.id, config: {} }]),
        else: makePipelineExpression([{ id: throwBlock.id, config: {} }]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ prop: "I'm a teapot" });
  });

  test("else branch", async () => {
    const pipeline = {
      id: ifElseBlock.id,
      config: {
        condition: false,
        // Throw to make it more obvious if this branch was taken
        if: makePipelineExpression([{ id: throwBlock.id, config: {} }]),
        else: makePipelineExpression([{ id: teapotBlock.id, config: {} }]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ prop: "I'm a teapot" });
  });

  test("else optional", async () => {
    const pipeline = {
      id: ifElseBlock.id,
      config: {
        condition: false,
        // Throw to make it more obvious if this branch was taken
        if: makePipelineExpression([{ id: throwBlock.id, config: {} }]),
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
