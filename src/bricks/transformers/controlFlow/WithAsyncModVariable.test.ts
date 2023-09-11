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

import { WithAsyncModVariable } from "@/bricks/transformers/controlFlow/WithAsyncModVariable";
import { makePipelineExpression } from "@/runtime/expressionCreators";
import {
  echoBrick,
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import blockRegistry from "@/bricks/registry";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import type { Logger } from "@/types/loggerTypes";
import { v4 } from "uuid";
import { getPageState } from "@/contentScript/pageState";
import { BrickABC } from "@/types/brickTypes";
import { propertiesToSchema } from "@/validators/generic";
import { BrickArgs } from "@/types/runtimeTypes";
import { waitForEffect } from "@/testUtils/testHelpers";

const withAsyncModVariableBrick = new WithAsyncModVariable();

class DeferredEchoBlock extends BrickABC {
  static BLOCK_ID = validateRegistryId("test/deferred");
  readonly promise: Promise<unknown>;
  constructor(promise: Promise<unknown>) {
    super(DeferredEchoBlock.BLOCK_ID, "Deferred Brick");
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

jest.mock("@/types/helpers", () => ({
  ...jest.requireActual("@/types/helpers"),
  uuidv4: jest.fn(() => v4()),
}));

describe("WithAsyncModVariable", () => {
  let logger: Logger;

  beforeEach(() => {
    blockRegistry.clear();
    blockRegistry.register([echoBrick, withAsyncModVariableBrick]);
    logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });
  });

  test("returns request nonce and initializes page state immediately", async () => {
    const expectedRequestNonce = v4();
    (uuidv4 as jest.Mock).mockReturnValue(expectedRequestNonce);

    const pipeline = {
      id: withAsyncModVariableBrick.id,
      config: {
        body: makePipelineExpression([
          {
            id: echoBrick.id,
            config: {
              message: "bar",
            },
          },
        ]),
        stateKey: "foo",
      },
    };

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    const pageState = getPageState({
      namespace: "blueprint",
      extensionId: logger.context.extensionId,
      blueprintId: logger.context.blueprintId,
    });

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expect(pageState).toStrictEqual({
      foo: {
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        currentData: null,
        data: null,
        requestId: null,
        error: null,
      },
    });
  });

  test("returns request nonce and sets page state on success", async () => {
    const expectedRequestNonce = v4();
    (uuidv4 as jest.Mock).mockReturnValue(expectedRequestNonce);

    const pipeline = {
      id: withAsyncModVariableBrick.id,
      config: {
        body: makePipelineExpression([
          {
            id: echoBrick.id,
            config: {
              message: "bar",
            },
          },
        ]),
        stateKey: "foo",
      },
    };

    const brickOutput = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    await new Promise(process.nextTick);

    const pageState = getPageState({
      namespace: "blueprint",
      extensionId: logger.context.extensionId,
      blueprintId: logger.context.blueprintId,
    });

    expect(brickOutput).toStrictEqual({
      requestId: expectedRequestNonce,
    });

    expect(pageState).toStrictEqual({
      foo: {
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        currentData: { message: "bar" },
        data: { message: "bar" },
        requestId: expectedRequestNonce,
        error: null,
      },
    });
  });
});
