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
import { InputValidationError } from "@/blocks/errors";
import { BlockPipeline } from "@/blocks/types";
import {
  contextBlock,
  echoBlock,
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/messenger/api";

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, contextBlock);
});

describe("apiVersion: v1", () => {
  test("true mustache conditional via implicit args", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        if: "{{# run }}true{{/ run }}",
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({ run: true }), optionsArgs: {} },
      testOptions("v1")
    );
    expect(result).toStrictEqual({ message: "Ran block" });
  });
});

describe.each([["v1"], ["v2"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("true mustache conditional", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        if: "{{# @input.run }}true{{/ @input.run }}",
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({ run: true }), optionsArgs: {} },
      testOptions(apiVersion)
    );
    expect(result).toStrictEqual({ message: "Ran block" });
  });
});

describe("false mustache conditional", () => {
  test("v1", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        if: "{{# @input.run }}true{{/ @input.run }}",
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({ run: false }), optionsArgs: {} },
      testOptions("v1")
    );
    // The original input is passed through
    expect(result).toStrictEqual({ run: false });
  });

  test("v2", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        if: "{{# @input.run }}true{{/ @input.run }}",
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({ run: false }), optionsArgs: {} },
      testOptions("v2")
    );
    // The starting value is {}
    expect(result).toStrictEqual({});
  });

  test("v3 - implicit mustache interpreted as string", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        if: "{{# @input.run }}true{{/ @input.run }}",
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({ run: false }), optionsArgs: {} },
      testOptions("v3")
    );
    // The block still doesn't run because the string is not truthy according to boolean
    expect(result).toStrictEqual({});
  });

  test("v3 - mustache provided", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        if: {
          __type__: "mustache",
          __value__: "{{# @input.run }}true{{/ @input.run }}",
        },
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline as BlockPipeline,
      { ...simpleInput({ run: false }), optionsArgs: {} },
      testOptions("v3")
    );
    expect(result).toStrictEqual({});
  });
});

describe("apiVersion: v2", () => {
  test("throws error on wrong input type", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        config: { message: "{{inputArg}}" },
      },
    ];
    try {
      await reducePipeline(
        pipeline,
        simpleInput({ inputArg: 42 }),
        testOptions("v2")
      );
    } catch (error) {
      expect(error).toBeInstanceOf(InputValidationError);
    }
  });
});
