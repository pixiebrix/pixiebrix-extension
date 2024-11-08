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

import { type ApiVersion } from "../../types/runtimeTypes";
import brickRegistry from "@/bricks/registry";
import { reducePipeline } from "../reducePipeline";
import { type BrickPipeline } from "@/bricks/types";
import { cloneDeep } from "lodash";
import { validateOutputKey } from "../runtimeTypes";
import { contextBrick, echoBrick, simpleInput } from "./testHelpers";
import { extraEmptyModStateContext } from "../extendModVariableContext";
import { reduceOptionsFactory } from "../../testUtils/factories/runtimeFactories";
import CommentEffect from "@/bricks/effects/comment";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, contextBrick, new CommentEffect()]);
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

  it("passes through previous value if outputKey is present", async () => {
    const initialContext = { inputArg: "bar" };
    const pipeline = [
      {
        id: echoBrick.id,
        // Is only brick in pipeline and has an outputKey, so the original input value is returned
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
    test("brick outputKey takes precedence over @input", async () => {
      const message = "First brick";

      const pipeline = [
        {
          id: echoBrick.id,
          outputKey: validateOutputKey("input"),
          config: {
            message,
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
        "@input": { message },
        "@options": {},
        ...extraEmptyModStateContext(apiVersion),
      });
    });
  },
);

describe.each([["v3"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("allow ignoring transformer brick output", async () => {
    const message = "First brick";

    const pipeline = [
      {
        id: echoBrick.id,
        outputKey: validateOutputKey("input"),
        config: {
          message,
        },
      },
      {
        id: echoBrick.id,
        config: {
          message: "Another message",
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
      "@input": { message },
      "@options": {},
      ...extraEmptyModStateContext(apiVersion),
    });
  });
});

describe.each([["v2"], ["v3"]])(
  "apiVersion: %s pipeline return values",
  (apiVersion: ApiVersion) => {
    it("returns transformer brick value", async () => {
      const pipeline = [
        {
          id: echoBrick.id,
          outputKey: validateOutputKey("output"),
          config: {
            message: "original message",
          },
        },
        {
          id: echoBrick.id,
          config: {
            message: "new message",
          },
        },
      ];
      const result = await reducePipeline(
        pipeline,
        simpleInput({}),
        reduceOptionsFactory(apiVersion),
      );

      expect(result).toStrictEqual({
        message: "new message",
      });
    });

    it("returns input context for effect brick in last position", async () => {
      const pipeline = [
        {
          id: echoBrick.id,
          outputKey: validateOutputKey("output"),
          config: {
            message: "original message",
          },
        },
        {
          // For backward compatability, there's still a subtle difference in behavior for effect bricks in the
          // last position in the pipeline
          id: CommentEffect.BRICK_ID,
          config: {},
        },
      ];

      const result = await reducePipeline(
        pipeline,
        simpleInput({ foo: 42 }),
        reduceOptionsFactory(apiVersion),
      );

      // In apiVersion: 2+, an empty object is provided as the initial implicit output
      expect(result).toStrictEqual({});
    });
  },
);
