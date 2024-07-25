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

import { type ApiVersion } from "@/types/runtimeTypes";
import brickRegistry from "@/bricks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import { type BrickPipeline } from "@/bricks/types";
import { cloneDeep } from "lodash";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { contextBrick, echoBrick, simpleInput } from "./pipelineTestHelpers";
import { extraEmptyModStateContext } from "@/runtime/extendModVariableContext";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, contextBrick]);
});

describe("apiVersion: v1", () => {
  test("pass data via output key", async () => {
    const pipeline: BrickPipeline = [
      {
        id: echoBrick.id,
        outputKey: validateOutputKey("foo"),
        config: { message: "{{inputArg}}" },
      },
      {
        id: echoBrick.id,
        config: { message: "hello, {{@foo.message}}" },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "bar" }),
      reduceOptionsFactory("v1"),
    );
    expect(result).toStrictEqual({ message: "hello, bar" });
  });

  test("outputKey passes through previous value", async () => {
    const initialContext = { inputArg: "bar" };
    const pipeline = [
      {
        id: echoBrick.id,
        // Is only block in pipeline and how an outputKey, so the original input value is returned
        outputKey: validateOutputKey("foo"),
        config: { message: "inputArg" },
      },
    ];

    const result = await reducePipeline(
      pipeline,
      simpleInput(cloneDeep(initialContext)),
      reduceOptionsFactory("v1"),
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
          id: echoBrick.id,
          outputKey: validateOutputKey("input"),
          config: {
            message: "First block",
          },
        },
        {
          id: contextBrick.id,
          config: {},
        },
      ];
      const result = await reducePipeline(
        pipeline,
        simpleInput({}),
        reduceOptionsFactory(apiVersion),
      );

      expect(result).toStrictEqual({
        "@input": { message: "First block" },
        "@options": {},
        ...extraEmptyModStateContext(apiVersion),
      });
    });
  },
);
