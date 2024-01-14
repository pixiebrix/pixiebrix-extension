/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import {
  appendEntry,
  clearLog,
  count,
  getLogEntries,
  sweepLogs,
  reportToApplicationErrorTelemetry,
  flattenStackForDatadog,
} from "@/telemetry/logging";
import { getErrorReporter } from "@/telemetry/initErrorReporter";
import {
  logEntryFactory,
  messageContextFactory,
} from "@/testUtils/factories/logFactories";
import { array } from "cooky-cutter";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { flagOn } from "@/auth/authUtils";
import type { ErrorObject } from "serialize-error";

// Disable automatic __mocks__ resolution
jest.mock("@/telemetry/logging", () => jest.requireActual("./logging.ts"));

jest.mock("@/auth/authUtils", () => ({
  flagOn: jest.fn().mockRejectedValue(new Error("Not mocked")),
}));

const flagOnMock = jest.mocked(flagOn);

jest.mock("@/telemetry/initErrorReporter");

const reportErrorMock = jest.fn();
jest.mocked(getErrorReporter).mockResolvedValue({
  error: reportErrorMock,
});

afterEach(async () => {
  await clearLog();
  flagOnMock.mockReset();
  reportErrorMock.mockReset();
});

describe("logging", () => {
  test("appendEntry", async () => {
    await appendEntry(logEntryFactory());
    await expect(count()).resolves.toBe(1);
  });

  test("clearLog as logs", async () => {
    await appendEntry(logEntryFactory());
    await expect(count()).resolves.toBe(1);
    await clearLog();
    await expect(count()).resolves.toBe(0);
  });

  test("clearLog by blueprint id", async () => {
    const blueprintId = registryIdFactory();

    await appendEntry(
      logEntryFactory({
        context: messageContextFactory({ blueprintId }),
      }),
    );

    await appendEntry(logEntryFactory());

    await clearLog({ blueprintId });

    await expect(count()).resolves.toBe(1);
  });

  test("sweep", async () => {
    await Promise.all(
      array(logEntryFactory, 1500)().map(async (x) => {
        await appendEntry(x);
      }),
    );

    await sweepLogs();

    await expect(count()).resolves.toBe(937);
    // Increase timeout so test isn't flakey on CI due to slow append operation
  }, 20_000);

  test("getLogEntries by blueprintId", async () => {
    const blueprintId = registryIdFactory();

    await appendEntry(
      logEntryFactory({
        context: messageContextFactory({ blueprintId }),
      }),
    );

    await appendEntry(logEntryFactory());

    await expect(getLogEntries({ blueprintId })).resolves.toStrictEqual([
      expect.objectContaining({
        context: expect.objectContaining({ blueprintId }),
      }),
    ]);
  });

  test("allow rollbar reporting", async () => {
    flagOnMock.mockResolvedValue(false);

    await reportToApplicationErrorTelemetry(new Error("test"), null, null);

    expect(flagOnMock).toHaveBeenCalledExactlyOnceWith(
      "rollbar-disable-report",
    );
    expect(reportErrorMock).toHaveBeenCalledOnce();
  });

  test("disable rollbar reporting", async () => {
    flagOnMock.mockResolvedValue(true);

    await reportToApplicationErrorTelemetry(new Error("test"), null, null);

    expect(flagOnMock).toHaveBeenCalledExactlyOnceWith(
      "rollbar-disable-report",
    );
    expect(reportErrorMock).not.toHaveBeenCalled();
  });
});

function errorFromStack(stack: string, cause?: ErrorObject): ErrorObject {
  const [type, message] = stack.split(/[\n:]/);
  return { type, message, stack, cause };
}

const stacks = [
  "ContextError: High level error\n    at someFunction (charizard.js:1:1)",
  "Error: Medium level error\n    at otherFunction (charmeleon.js:1:1)",
  "TypeError: Low level error\n    at atob (charmander.js:1:1)",
];

describe("flattenStackForRollbar", () => {
  test("preserves the stack unchanged if there's no cause", () => {
    expect(flattenStackForDatadog(stacks[0])).toMatchInlineSnapshot(`
      "ContextError: High level error
          at someFunction (charizard.js:1:1)"
    `);
  });
  test("appends the stack from the cause", () => {
    expect(flattenStackForDatadog(stacks[0], errorFromStack(stacks[1])))
      .toMatchInlineSnapshot(`
        "ContextError: High level error
            at someFunction (charizard.js:1:1)
            at CAUSED (BY.js:0:0) Error:-Medium-level-error
            at otherFunction (charmeleon.js:1:1)"
      `);
  });
  test("appends the stack from the cause 2", () => {
    expect(
      flattenStackForDatadog(
        stacks[0],
        errorFromStack(stacks[1], errorFromStack(stacks[2])),
      ),
    ).toMatchInlineSnapshot(`
      "ContextError: High level error
          at someFunction (charizard.js:1:1)
          at CAUSED (BY.js:0:0) Error:-Medium-level-error
          at otherFunction (charmeleon.js:1:1)
          at CAUSED (BY.js:0:0) TypeError:-Low-level-error
          at atob (charmander.js:1:1)"
    `);
  });
});
