/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/logging";
import { fromJS } from "@/blocks/transformers/blockFactory";

jest.mock("@/background/trace");
(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, contextBlock);
});

describe("component block", () => {
  test("component block uses own declared runtime within the brick", async () => {
    const componentBlock = fromJS({
      apiVersion: "v1",
      kind: "component",
      metadata: {
        id: "test/component",
        name: "Component Block",
        version: "1.0.0",
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
