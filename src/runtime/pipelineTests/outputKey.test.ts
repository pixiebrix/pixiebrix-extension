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

import { ApiVersion } from "@/core";
import blockRegistry from "@/blocks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import { BlockPipeline } from "@/blocks/types";
import { cloneDeep } from "lodash";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import {
  contextBlock,
  echoBlock,
  simpleInput,
  testOptions,
} from "./pipelineTestHelpers";

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

describe("apiVersion: v1", () => {
  test("pass data via output key", async () => {
    const pipeline: BlockPipeline = [
      {
        id: echoBlock.id,
        outputKey: validateOutputKey("foo"),
        config: { message: "{{inputArg}}" },
      },
      {
        id: echoBlock.id,
        config: { message: "hello, {{@foo.message}}" },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "bar" }),
      testOptions("v1")
    );
    expect(result).toStrictEqual({ message: "hello, bar" });
  });

  test("outputKey passes through previous value", async () => {
    const initialContext = { inputArg: "bar" };
    const pipeline = [
      {
        id: echoBlock.id,
        // Is only block in pipeline and how an outputKey, so the original input value is returned
        outputKey: validateOutputKey("foo"),
        config: { message: "inputArg" },
      },
    ];

    const result = await reducePipeline(
      pipeline,
      simpleInput(cloneDeep(initialContext)),
      testOptions("v1")
    );
    expect(result).toStrictEqual(initialContext);
  });
});

describe.each([["v1"], ["v2"], ["v3"]])(
  "apiVersion: %s",
  (apiVersion: ApiVersion) => {
    test("block outputKey takes precedence over @input", async () => {
      const pipeline = [
        {
          id: echoBlock.id,
          outputKey: validateOutputKey("input"),
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
        simpleInput({}),
        testOptions(apiVersion)
      );
      expect(result).toStrictEqual({
        "@input": { message: "First block" },
        "@options": {},
      });
    });
  }
);
