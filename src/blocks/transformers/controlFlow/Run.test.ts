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

import blockRegistry from "@/blocks/registry";
import {
  echoBlock,
  simpleInput,
  testOptions,
  throwBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import { makePipelineExpression } from "@/runtime/expressionCreators";
import Run from "@/blocks/transformers/controlFlow/Run";
import { BrickABC } from "@/types/blockTypes";
import { validateRegistryId } from "@/types/helpers";
import { propertiesToSchema } from "@/validators/generic";
import { type BrickArgs } from "@/types/runtimeTypes";
import pDefer from "p-defer";

const runBlock = new Run();

class DeferredEchoBlock extends BrickABC {
  static BLOCK_ID = validateRegistryId("test/deferred");
  readonly promise: Promise<unknown>;
  constructor(promise: Promise<unknown>) {
    super(DeferredEchoBlock.BLOCK_ID, "Deferred BrickABC");
    this.promise = promise;
  }

  inputSchema = propertiesToSchema({
    message: {
      type: "string",
    },
  });

  async run({ message }: BrickArgs) {
    await this.promise;
    return { message };
  }
}

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register([throwBlock, echoBlock, runBlock]);
});

describe("Run", () => {
  test("throws error body fails", async () => {
    const pipeline = {
      id: runBlock.id,
      config: {
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

    return expect(
      reducePipeline(pipeline, simpleInput({}), testOptions("v3"))
    ).rejects.toThrow();
  });

  test("returns result on success", async () => {
    const pipeline = {
      id: runBlock.id,
      config: {
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

  test("async returns immediately", async () => {
    const deferred = pDefer();
    const asyncBlock = new DeferredEchoBlock(deferred.promise);

    blockRegistry.register([asyncBlock]);
    const pipeline = {
      id: runBlock.id,
      config: {
        async: true,
        body: makePipelineExpression([
          {
            id: asyncBlock.id,
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

    expect(result).toStrictEqual({});
  });
});
