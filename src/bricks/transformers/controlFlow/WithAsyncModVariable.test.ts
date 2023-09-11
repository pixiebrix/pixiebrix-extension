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

const withAsyncModVariableBrick = new WithAsyncModVariable();

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

  test("returns request nonce on success", async () => {
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

    const result = await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger,
    });

    expect(result).toEqual({
      requestId: expectedRequestNonce,
    });
  });
});
