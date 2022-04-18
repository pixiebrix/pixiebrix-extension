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

import { Expression, OutputKey, RenderedArgs, TemplateEngine } from "@/core";
import blockRegistry from "@/blocks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import {
  contextBlock,
  echoBlock,
  simpleInput,
  testOptions,
  throwBlock,
} from "./pipelineTestHelpers";
import { uuidv4 } from "@/types/helpers";

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/messenger/api";
import { traces } from "@/background/messenger/api";
import {
  TraceEntryData,
  TraceExitData,
  TraceRecordMeta,
} from "@/telemetry/trace";
import ConsoleLogger from "@/utils/ConsoleLogger";
import MockDate from "mockdate";
import { BlockPipeline } from "@/blocks/types";
import { validateOutputKey } from "@/runtime/runtimeTypes";

jest.mock("@/background/messenger/api");
(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, contextBlock, throwBlock);
  (traces.addEntry as any).mockReset();
  (traces.addExit as any).mockReset();
});

function makeExpression(template: TemplateEngine, value: string): Expression {
  return {
    __type__: template,
    __value__: value,
  };
}

describe("Trace normal exit", () => {
  test("trace entry and normal exit", async () => {
    const instanceId = uuidv4();

    const result = await reducePipeline(
      {
        id: echoBlock.id,
        config: { message: makeExpression("nunjucks", "{{@input.inputArg}}") },
        instanceId,
      },
      simpleInput({ inputArg: "hello" }),
      testOptions("v3")
    );

    expect(result).toStrictEqual({ message: "hello" });

    expect(traces.addEntry).toHaveBeenCalledTimes(1);
    expect(traces.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        renderedArgs: expect.objectContaining({
          message: "hello",
        }),
        renderError: null,
      })
    );
    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        skippedRun: false,
      })
    );
  });
});

describe("Trace render error", () => {
  test("Trace input render error", async () => {
    const instanceId = uuidv4();

    await expect(async () =>
      reducePipeline(
        {
          id: echoBlock.id,
          config: { message: makeExpression("var", "@doesNotExist.bar") },
          instanceId,
        },
        simpleInput({ inputArg: "hello" }),
        testOptions("v3")
      )
    ).rejects.toThrowError(/doesNotExist/);

    expect(traces.addEntry).toHaveBeenCalledTimes(1);
    expect(traces.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        renderedArgs: undefined,
        renderError: expect.objectContaining({
          message: expect.anything(),
        }),
      })
    );

    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "@doesNotExist.bar undefined (missing @doesNotExist)",
        }),
      })
    );
  });

  test("Doesn't throw when skipped", async () => {
    const instanceId = uuidv4();

    await reducePipeline(
      {
        id: echoBlock.id,
        config: { message: makeExpression("var", "@doesNotExist.bar") },
        outputKey: validateOutputKey("conditional"),
        if: "f",
        instanceId,
      },
      simpleInput({ inputArg: "hello" }),
      testOptions("v3")
    );

    expect(traces.addEntry).toHaveBeenCalledTimes(1);
    expect(traces.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        renderedArgs: undefined,
        renderError: expect.objectContaining({
          message: expect.anything(),
        }),
      })
    );

    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        skippedRun: true,
      })
    );
  });
});

describe("Trace conditional execution", () => {
  test("Trace false conditional", async () => {
    await reducePipeline(
      [
        {
          id: echoBlock.id,
          config: {
            message: makeExpression("nunjucks", "{{@input.inputArg}}"),
          },
          outputKey: validateOutputKey("conditional"),
          if: "f",
          instanceId: uuidv4(),
        },
        {
          id: echoBlock.id,
          config: { message: makeExpression("var", "@conditional.property") },
          if: makeExpression("nunjucks", "{{true if @conditional}}"),
          instanceId: uuidv4(),
        },
      ],
      simpleInput({ inputArg: "hello" }),
      testOptions("v3")
    );

    expect(traces.addEntry).toHaveBeenCalledTimes(2);

    expect(traces.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        renderedArgs: { message: "hello" },
      })
    );

    expect(traces.addExit).toHaveBeenCalledTimes(2);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        skippedRun: true,
      })
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
      id: echoBlock.id,
      config: { message: "{{@input.inputArg}}" },
      instanceId,
    };

    const logger = new ConsoleLogger().childLogger({ extensionId });

    await reducePipeline(blockConfig, simpleInput({ inputArg: "hello" }), {
      ...testOptions("v2"),
      runId,
      logger,
    });

    const meta: TraceRecordMeta = {
      extensionId,
      runId,
      blockInstanceId: instanceId,
      blockId: echoBlock.id,
    };

    const expectedEntry: TraceEntryData = {
      ...meta,
      timestamp: timestamp.toISOString(),
      blockConfig,
      templateContext: { "@input": { inputArg: "hello" }, "@options": {} },
      renderedArgs: { message: "hello" } as unknown as RenderedArgs,
      renderError: null,
    };

    const expectedExit: TraceExitData = {
      ...meta,
      outputKey: undefined,
      output: { message: "hello" },
      skippedRun: false,
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

    const blockConfig: BlockPipeline = [
      {
        id: echoBlock.id,
        config: { message: "{{@input.inputArg}}" },
        outputKey,
        instanceId,
      },
      {
        id: contextBlock.id,
        config: {},
        instanceId: uuidv4(),
      },
    ];

    const logger = new ConsoleLogger().childLogger({ extensionId });

    await reducePipeline(blockConfig, simpleInput({ inputArg: "hello" }), {
      ...testOptions("v2"),
      runId,
      logger,
    });

    const meta: TraceRecordMeta = {
      extensionId,
      runId,
      blockInstanceId: instanceId,
      blockId: echoBlock.id,
    };

    const expectedExit: TraceExitData = {
      ...meta,
      outputKey,
      output: { message: "hello" },
      skippedRun: false,
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

    const blockConfig: BlockPipeline = [
      {
        id: throwBlock.id,
        config: { message: "{{@input.inputArg}}" },
        outputKey,
        instanceId,
      },
      {
        id: contextBlock.id,
        config: {},
        instanceId: uuidv4(),
      },
    ];

    const logger = new ConsoleLogger().childLogger({ extensionId });

    await expect(async () => {
      await reducePipeline(blockConfig, simpleInput({ inputArg: "hello" }), {
        ...testOptions("v2"),
        runId,
        logger,
      });
    }).rejects.toThrow();

    const meta: TraceRecordMeta = {
      extensionId,
      runId,
      blockInstanceId: instanceId,
      blockId: throwBlock.id,
    };

    expect(traces.addExit).toHaveBeenCalledTimes(1);
    expect(traces.addExit).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: meta.runId,
        blockInstanceId: meta.blockInstanceId,
        error: expect.objectContaining({
          name: "BusinessError",
          message: "hello",
        }),
      })
    );
  });
});
