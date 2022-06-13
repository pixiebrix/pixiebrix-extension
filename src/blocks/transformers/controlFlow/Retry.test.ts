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
  throwBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import * as logging from "@/background/messenger/api";
import { makePipelineExpression } from "@/testUtils/expressionTestHelpers";
import Retry from "@/blocks/transformers/controlFlow/Retry";

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

const retryBlock = new Retry();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(throwBlock, echoBlock, retryBlock);
});

describe("Retry", () => {
  test("throws error if retries fail", async () => {
    const pipeline = {
      id: retryBlock.id,
      config: {
        maxRetries: 2,
        body: makePipelineExpression([
          {
            id: throwBlock.id,
            config: {
              message: "This is an error message!",
            },
          },
        ]),
      },
    };

    expect(
      reducePipeline(pipeline, simpleInput({}), testOptions("v3"))
    ).rejects.toReject();
  });

  test("returns result on success", async () => {
    const pipeline = {
      id: retryBlock.id,
      config: {
        maxRetries: 2,
        body: makePipelineExpression([
          {
            id: echoBlock.id,
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
      testOptions("v3")
    );

    expect(result).toStrictEqual({
      message: "Hello, world!",
    });
  });
});
