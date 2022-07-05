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
import { makePipelineExpression } from "@/testUtils/expressionTestHelpers";
import ForEachElement from "./ForEachElement";

jest.mock("@/background/messenger/api", () => {
  const actual = jest.requireActual("@/background/messenger/api");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

const forEachBlock = new ForEachElement();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, forEachBlock);
});

describe("ForEachElement", () => {
  test("no matches returns undefined", async () => {
    const pipeline = {
      id: forEachBlock.id,
      config: {
        selector: "table",
        body: makePipelineExpression([
          {
            id: echoBlock.id,
            config: {
              message: "This is a message",
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

    expect(result).toBeUndefined();
  });

  test("loop smoke test", async () => {
    const pipeline = {
      id: forEachBlock.id,
      config: {
        // The jsdom has one body tag
        selector: "body",
        body: makePipelineExpression([
          {
            id: echoBlock.id,
            config: {
              message: "This is a message",
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

    expect(result).toStrictEqual({ message: "This is a message" });
  });
});
