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

import { ApiVersion } from "@/core";
import blockRegistry from "@/blocks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import { BlockPipeline } from "@/blocks/types";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import {
  contextBlock,
  echoBlock,
  simpleInput,
  testOptions,
} from "./pipelineTestHelpers";
import { UnknownObject } from "@/types";

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/logging";
jest.mock("@/background/trace");
(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, contextBlock);
});

describe("apiVersion: v1", () => {
  test("pass input and block output on root intermediate state", async () => {
    const pipeline: BlockPipeline = [
      {
        id: echoBlock.id,
        config: { message: "{{inputArg}}" },
      },
      {
        id: echoBlock.id,
        config: { message: "hello, {{message}}" },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "bar" }),
      testOptions("v1")
    );
    expect(result).toStrictEqual({ message: "hello, bar" });
  });

  test("pass block output in context to next block", async () => {
    const pipeline: BlockPipeline = [
      {
        id: echoBlock.id,
        config: { message: "{{inputArg}}" },
      },
      {
        id: contextBlock.id,
        config: {},
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "bar" }),
      testOptions("v1")
    );
    expect(result).toStrictEqual({
      "@input": { inputArg: "bar" },
      "@options": {},
      message: "bar",
    });
  });
});

describe.each([["v2"], ["v3"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("inputs only passed via @input", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        outputKey: validateOutputKey("first"),
        config: {
          message: "First block",
        },
      },
      {
        id: contextBlock.id,
        config: {},
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions(apiVersion)
    );

    expect(result).toStrictEqual({
      "@input": { inputArg: "hello" },
      "@options": {},
      "@first": { message: "First block" },
    });

    expect((result as UnknownObject).inputArg).toBeUndefined();
  });
});
