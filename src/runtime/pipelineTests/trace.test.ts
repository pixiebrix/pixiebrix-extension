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

import { OutputKey, RenderedArgs } from "@/core";
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

describe("Trace exceptional exit", () => {
  test("trace entry and normal exit", async () => {
    const instanceId = uuidv4();

    const result = await reducePipeline(
      {
        id: echoBlock.id,
        config: { message: "{{@input.inputArg}}" },
        instanceId,
      },
      simpleInput({ inputArg: "hello" }),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "{{@input.inputArg}}" });
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

    // Can't use toHaveBeenNthCalledWith because we don't want to include the stack trace in the test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test code
    const args = (traces.addExit as any).mock.calls[0][0];
    expect(args.runId).toBe(meta.runId);
    expect(args.blockInstanceId).toBe(meta.blockInstanceId);
    expect(args.error.name).toBe("BusinessError");
    expect(args.error.message).toBe("hello");
  });
});
