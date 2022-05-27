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
  echoBlock,
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import * as logging from "@/background/messenger/api";
import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import {
  makePipelineExpression,
  makeTemplateExpression,
} from "@/testUtils/expressionTestHelpers";

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

const forEachBlock = new ForEach();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, forEachBlock);
});

describe("ForEach", () => {
  test("loop", async () => {
    const pipeline = {
      id: forEachBlock.id,
      config: {
        elements: makeTemplateExpression("var", "@input.elements"),
        body: makePipelineExpression([
          {
            id: echoBlock.id,
            config: {
              message: makeTemplateExpression(
                "nunjucks",
                "iteration {{ @element }}"
              ),
            },
          },
        ]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ elements: [1, 2, 3] }),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "iteration 3" });
  });
});
