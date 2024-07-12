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

import brickRegistry from "@/bricks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import {
  contextBrick,
  echoBrick,
  simpleInput,
  throwBrick,
} from "./pipelineTestHelpers";
import { uuidv4 } from "@/types/helpers";
import { traces } from "@/background/messenger/api";
import {
  type TraceEntryData,
  type TraceExitData,
  type TraceRecordMeta,
} from "@/telemetry/trace";
import ConsoleLogger from "@/utils/ConsoleLogger";
import MockDate from "mockdate";
import { type BrickPipeline } from "@/bricks/types";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { type OutputKey, type RenderedArgs } from "@/types/runtimeTypes";
import { toExpression } from "@/utils/expressionUtils";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const addEntryMock = jest.mocked(traces.addEntry);
const addExitMock = jest.mocked(traces.addExit);

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, contextBrick, throwBrick]);
  addEntryMock.mockReset();
  addExitMock.mockReset();
});

describe("Trace normal exit", () => {
  test("trace entry and normal exit", async () => {
    const instanceId = uuidv4();

    const result = await reducePipeline(
      {
        id: echoBrick.id,
        config: {
          message: toExpression("nunjucks", "{{@input.inputArg}}"),
        },
        instanceId,
      },
      simpleInput({ inputArg: "hello" }),
      { ...reduceOptionsFactory("v3"), runId: uuidv4() },
    );

    expect(result).toStrictEqual({ message: "hello" });

    expect(traces.addEntry).toHaveBeenCalledTimes(1);
    expect(traces.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        renderedArgs: expect.objectContaining({
          message: "hello",
        }),
        renderError: null,
      }),
    );
    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        skippedRun: false,
      }),
    );
  });

  test("skip trace by default", async () => {
    const instanceId = uuidv4();

    const result = await reducePipeline(
      {
        id: echoBrick.id,
        config: {
          message: toExpression("nunjucks", "{{@input.inputArg}}"),
        },
        instanceId,
      },
      simpleInput({ inputArg: "hello" }),
      // `runId` defaults to null
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({ message: "hello" });

    expect(traces.addEntry).toHaveBeenCalledTimes(0);
  });
});

describe("Trace render error", () => {
  test("Trace input render error", async () => {
    const instanceId = uuidv4();

    await expect(async () =>
      reducePipeline(
        {
          id: echoBrick.id,
          config: {
            message: toExpression("var", "@doesNotExist.bar"),
          },
          instanceId,
        },
        simpleInput({ inputArg: "hello" }),
        { ...reduceOptionsFactory("v3"), runId: uuidv4() },
      ),
    ).rejects.toThrow(/doesNotExist/);

    expect(traces.addEntry).toHaveBeenCalledTimes(1);
    expect(traces.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        renderedArgs: undefined,
        renderError: expect.objectContaining({
          message: expect.anything(),
        }),
      }),
    );

    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "@doesNotExist.bar undefined (missing @doesNotExist)",
        }),
      }),
    );
  });

  test("Doesn't throw when skipped", async () => {
    const instanceId = uuidv4();

    await reducePipeline(
      {
        id: echoBrick.id,
        config: { message: toExpression("var", "@doesNotExist.bar") },
        outputKey: validateOutputKey("conditional"),
        if: "f",
        instanceId,
      },
      simpleInput({ inputArg: "hello" }),
      { ...reduceOptionsFactory("v3"), runId: uuidv4() },
    );

    expect(traces.addEntry).toHaveBeenCalledTimes(1);
    expect(traces.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        renderedArgs: undefined,
        renderError: expect.objectContaining({
          message: expect.anything(),
        }),
      }),
    );

    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        skippedRun: true,
      }),
    );
  });
});

describe("Trace conditional execution", () => {
  test("Trace false conditional", async () => {
    await reducePipeline(
      [
        {
          id: echoBrick.id,
          config: {
            message: toExpression("nunjucks", "{{@input.inputArg}}"),
          },
          outputKey: validateOutputKey("conditional"),
          if: "f",
          instanceId: uuidv4(),
        },
        {
          id: echoBrick.id,
          config: {
            message: toExpression("var", "@conditional.property"),
          },
          if: toExpression("nunjucks", "{{true if @conditional}}"),
          instanceId: uuidv4(),
        },
      ],
      simpleInput({ inputArg: "hello" }),
      { ...reduceOptionsFactory("v3"), runId: uuidv4() },
    );

    expect(traces.addEntry).toHaveBeenCalledTimes(2);

    expect(traces.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        renderedArgs: { message: "hello" },
      }),
    );

    expect(traces.addExit).toHaveBeenCalledTimes(2);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        skippedRun: true,
      }),
    );
  });
});

describe("Trace normal execution", () => {
  test("trace entry and normal exit", async () => {
    const timestamp = new Date("10/31/2021");
    MockDate.set(timestamp);

    const instanceId = uuidv4();
    const runId = uuidv4();
    const extensionId = uuidv4();

    const blockConfig = {
      id: echoBrick.id,
      config: { message: "{{@input.inputArg}}" },
      instanceId,
    };

    const logger = new ConsoleLogger().childLogger({
      modComponentId: extensionId,
    });

    await reducePipeline(blockConfig, simpleInput({ inputArg: "hello" }), {
      ...reduceOptionsFactory("v2"),
      runId,
      logger,
      modComponentId: extensionId,
    });

    const meta: TraceRecordMeta = {
      modComponentId: extensionId,
      runId,
      branches: [],
      brickInstanceId: instanceId,
      brickId: echoBrick.id,
    };

    const expectedEntry: TraceEntryData = {
      ...meta,
      timestamp: timestamp.toISOString(),
      brickConfig: blockConfig,
      templateContext: { "@input": { inputArg: "hello" }, "@options": {} },
      renderedArgs: { message: "hello" } as unknown as RenderedArgs,
      renderError: null,
    };

    const expectedExit: TraceExitData = {
      ...meta,
      outputKey: undefined,
      output: { message: "hello" },
      skippedRun: false,
      isRenderer: false,
      isFinal: true,
    };

    expect(traces.addEntry).toHaveBeenCalledTimes(1);
    expect(traces.addEntry).toHaveBeenCalledWith(expectedEntry);

    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(expectedExit);
  });

  test("trace output key exit", async () => {
    const timestamp = new Date("10/31/2021");
    MockDate.set(timestamp);

    const instanceId = uuidv4();
    const runId = uuidv4();
    const extensionId = uuidv4();
    const outputKey = "echo" as OutputKey;

    const blockConfig: BrickPipeline = [
      {
        id: echoBrick.id,
        config: { message: "{{@input.inputArg}}" },
        outputKey,
        instanceId,
      },
      {
        id: contextBrick.id,
        config: {},
        instanceId: uuidv4(),
      },
    ];

    const logger = new ConsoleLogger().childLogger({
      modComponentId: extensionId,
    });

    await reducePipeline(blockConfig, simpleInput({ inputArg: "hello" }), {
      ...reduceOptionsFactory("v2"),
      modComponentId: extensionId,
      runId,
      logger,
    });

    const meta: TraceRecordMeta = {
      modComponentId: extensionId,
      runId,
      branches: [],
      brickInstanceId: instanceId,
      brickId: echoBrick.id,
    };

    const expectedExit: TraceExitData = {
      ...meta,
      outputKey,
      output: { message: "hello" },
      skippedRun: false,
      isRenderer: false,
      isFinal: true,
    };

    expect(traces.addExit).toHaveBeenCalledTimes(2);
    expect(traces.addExit).toHaveBeenNthCalledWith(1, expectedExit);
  });

  test("trace exceptional exit", async () => {
    const timestamp = new Date("10/31/2021");
    MockDate.set(timestamp);

    const instanceId = uuidv4();
    const runId = uuidv4();
    const extensionId = uuidv4();
    const outputKey = "never" as OutputKey;

    const blockConfig: BrickPipeline = [
      {
        id: throwBrick.id,
        config: { message: "{{@input.inputArg}}" },
        outputKey,
        instanceId,
      },
      {
        id: contextBrick.id,
        config: {},
        instanceId: uuidv4(),
      },
    ];

    const logger = new ConsoleLogger().childLogger({
      modComponentId: extensionId,
    });

    await expect(async () => {
      await reducePipeline(blockConfig, simpleInput({ inputArg: "hello" }), {
        ...reduceOptionsFactory("v2"),
        runId,
        logger,
      });
    }).rejects.toThrow();

    const meta: TraceRecordMeta = {
      modComponentId: extensionId,
      runId,
      branches: [],
      brickInstanceId: instanceId,
      brickId: throwBrick.id,
    };

    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: meta.runId,
        brickInstanceId: meta.brickInstanceId,
        error: expect.objectContaining({
          name: "BusinessError",
          message: "hello",
        }),
      }),
    );
  });
});

describe("Tracing disabled", () => {
  it("Records brick runs to telemetry if tracing disabled", async () => {
    const result = await reducePipeline(
      {
        id: echoBrick.id,
        config: {
          message: toExpression("nunjucks", "{{@input.inputArg}}"),
        },
      },
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({ message: "hello" });
  });

  it("Does not call addEntry or addExit if tracing is disabled", async () => {
    const result = await reducePipeline(
      {
        id: echoBrick.id,
        config: {
          message: toExpression("nunjucks", "{{@input.inputArg}}"),
        },
      },
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({ message: "hello" });

    expect(traces.addEntry).not.toHaveBeenCalled();
    expect(traces.addExit).not.toHaveBeenCalled();
  });

  it("Does not render config if condition is false and tracing is disabled", async () => {
    // XXX: this doesn't appear to be working
    jest.doMock("@/runtime/renderers", () => ({
      engineRenderer: jest.fn().mockImplementation(() => {
        throw new Error("should not be called");
      }),
    }));

    const result = await reducePipeline(
      {
        id: echoBrick.id,
        if: false,
        config: {
          message: toExpression("nunjucks", "Hello, {{@input.inputArg}}"),
        },
      },
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({});

    // I manually verified engineRenderer doesn't get called. It's not clear how to only mock in this method. See
    // comment above
    expect(traces.addEntry).not.toHaveBeenCalled();
    expect(traces.addExit).not.toHaveBeenCalled();
  });
});
