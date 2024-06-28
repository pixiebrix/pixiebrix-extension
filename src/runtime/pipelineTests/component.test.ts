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

import blockRegistry from "@/bricks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import { type BrickPipeline } from "@/bricks/types";
import {
  contextBrick,
  echoBrick,
  simpleInput,
  testOptions,
} from "./pipelineTestHelpers";

import { fromJS } from "@/bricks/transformers/brickFactory";
import { normalizeSemVerString } from "@/types/helpers";
import { TEST_setContext } from "webext-detect-page";
import { toExpression } from "@/utils/expressionUtils";
import { DefinitionKinds } from "@/types/registryTypes";

TEST_setContext("contentScript");

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register([echoBrick, contextBrick]);
});

const componentBlock = fromJS(blockRegistry, {
  apiVersion: "v1",
  kind: DefinitionKinds.BRICK,
  metadata: {
    id: "test/component",
    name: "Component Brick",
    version: normalizeSemVerString("1.0.0"),
    description: "Component block using v1 runtime",
  },
  inputSchema: {
    message: {
      type: "string",
    },
  },
  pipeline: [
    {
      id: echoBrick.id,
      // Implicit application of mustache template referencing input without @input
      config: { message: "{{message}}" },
    },
  ],
});

describe("component block v1", () => {
  test("v2 pipeline calling v1 block", async () => {
    blockRegistry.register([componentBlock]);

    const pipeline = [
      {
        id: "test/component",
        outputKey: "first",
        config: {
          message: "@input.inputArg",
        },
      },
      {
        id: echoBrick.id,
        config: {
          message: "{{@first.message}}",
        },
      },
    ] as BrickPipeline;

    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions("v2"),
    );

    expect(result).toStrictEqual({ message: "hello" });
  });

  test("v3 pipeline calling v1 block", async () => {
    blockRegistry.register([componentBlock]);

    const pipeline = [
      {
        id: "test/component",
        outputKey: "first",
        config: {
          message: toExpression("var", "@input.inputArg"),
        },
      },
      {
        id: echoBrick.id,
        config: {
          message: toExpression("mustache", "{{@first.message}}"),
        },
      },
    ] as BrickPipeline;

    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions("v3"),
    );

    expect(result).toStrictEqual({ message: "hello" });
  });
});
