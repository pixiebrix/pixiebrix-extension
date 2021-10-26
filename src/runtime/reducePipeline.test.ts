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

import { ApiVersion, BlockArg, BlockOptions } from "@/core";
import ConsoleLogger from "@/tests/ConsoleLogger";
import { Block, UnknownObject } from "@/types";
import { propertiesToSchema } from "@/validators/generic";
import blockRegistry from "@/blocks/registry";
import { InitialValues, reducePipeline } from "@/runtime/reducePipeline";
import { InputValidationError } from "@/blocks/errors";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { BlockPipeline } from "@/blocks/types";
import { cloneDeep } from "lodash";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import * as logging from "@/background/logging";

test("dummy test", async () => {
  console.warn("combinator tests are disabled");
});

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
jest.mock("@/background/trace");

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

const logger = new ConsoleLogger();

class ContextBlock extends Block {
  constructor() {
    super("test/context", "Return Context");
  }

  inputSchema = propertiesToSchema({});

  async run(arg: BlockArg, { ctxt }: BlockOptions) {
    return ctxt;
  }
}

class EchoBlock extends Block {
  constructor() {
    super("test/echo", "Echo Block");
  }

  inputSchema = propertiesToSchema({
    message: {
      type: "string",
    },
  });

  async run({ message }: BlockArg) {
    return { message };
  }
}

const echoBlock = new EchoBlock();
const contextBlock = new ContextBlock();

/**
 * Helper method to pass only `input` to reducePipeline.
 */
function simpleInput(input: UnknownObject): InitialValues {
  return {
    input,
    root: null,
    serviceContext: {},
    optionsArgs: {},
  };
}

/**
 * Common reducePipeline options
 */
function testOptions(version: ApiVersion) {
  return {
    logger,
    ...apiVersionOptions(version),
  };
}

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, contextBlock);
});

describe("apiVersion: v1", () => {
  test("run a single echoBlock with mustache", async () => {
    const pipeline = {
      id: echoBlock.id,
      config: { message: "{{inputArg}}" },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions("v1")
    );
    expect(result).toStrictEqual({ message: "hello" });
  });

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
        testOptions("v1")
      );
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(InputValidationError);
    }
  });

  test("throws error on missing input", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        config: { message: "{{inputArg}}" },
      },
    ];
    try {
      await reducePipeline(pipeline, simpleInput({}), testOptions("v1"));
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(InputValidationError);
    }
  });

  test("pass data via implicit flow", async () => {
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
  test("implicit use option", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        config: {
          message: "@options.message",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: { message: "Test message" } },
      testOptions(apiVersion)
    );
    expect(result).toStrictEqual({ message: "Test message" });
  });

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

describe.each([["v1"], ["v2"], ["v3"]])(
  "apiVersion: %s",
  (apiVersion: ApiVersion) => {
    test("block outputKey takes precedence", async () => {
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
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(InputValidationError);
    }
  });
});

describe.each([["v2"], ["v3"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("no implicit inputs", async () => {
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
  });
});

describe("apiVersion: v3", () => {
  test("ignore implicit mustache template", async () => {
    const pipeline = {
      id: echoBlock.id,
      config: { message: "{{@input.inputArg}}" },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "{{@input.inputArg}}" });
  });

  test("apply explicit mustache template", async () => {
    const pipeline = {
      id: echoBlock.id,
      config: {
        message: {
          __type__: "mustache",
          __value__: "{{@input.inputArg}}",
        },
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "hello" });
  });

  test("apply explicit var", async () => {
    const pipeline = {
      id: echoBlock.id,
      config: {
        message: {
          __type__: "var",
          __value__: "@input.inputArg",
        },
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "hello" });
  });
});
