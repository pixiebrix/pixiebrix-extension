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
import { reducePipeline } from "@/runtime/reducePipeline";
import { BlockPipeline } from "@/blocks/types";
import {
  contextBlock,
  echoBlock,
  simpleInput,
  testOptions,
} from "./pipelineTestHelpers";

import { fromJS } from "@/blocks/transformers/blockFactory";
import { validateSemVerString } from "@/types/helpers";

jest.mock("@/background/messenger/api", () => {
  const actual = jest.requireActual("@/background/messenger/api");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, contextBlock);
});

const componentBlock = fromJS({
  apiVersion: "v1",
  kind: "component",
  metadata: {
    id: "test/component",
    name: "Component Block",
    version: validateSemVerString("1.0.0"),
    description: "Component block using v1 runtime",
  },
  inputSchema: {
    message: {
      type: "string",
    },
  },
  pipeline: [
    {
      id: echoBlock.id,
      // Implicit application of mustache template referencing input without @input
      config: { message: "{{message}}" },
    },
  ],
});

describe("component block v1", () => {
  test("v2 pipeline calling v1 block", async () => {
    blockRegistry.register(componentBlock);

    const pipeline = [
      {
        id: "test/component",
        outputKey: "first",
        config: {
          message: "@input.inputArg",
        },
      },
      {
        id: echoBlock.id,
        config: {
          message: "{{@first.message}}",
        },
      },
    ] as BlockPipeline;

    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions("v2")
    );

    expect(result).toStrictEqual({ message: "hello" });
  });

  test("v3 pipeline calling v1 block", async () => {
    blockRegistry.register(componentBlock);

    const pipeline = [
      {
        id: "test/component",
        outputKey: "first",
        config: {
          message: {
            __type__: "var",
            __value__: "@input.inputArg",
          },
        },
      },
      {
        id: echoBlock.id,
        config: {
          message: {
            __type__: "mustache",
            __value__: "{{@first.message}}",
          },
        },
      },
    ] as BlockPipeline;

    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions("v3")
    );

    expect(result).toStrictEqual({ message: "hello" });
  });
});
