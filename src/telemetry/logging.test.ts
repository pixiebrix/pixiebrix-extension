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

import {
  appendEntry,
  clearLog,
  count,
  getLogEntries,
  sweepLogs,
} from "@/telemetry/logging";
import {
  logEntryFactory,
  messageContextFactory,
} from "@/testUtils/factories/logFactories";
import { array } from "cooky-cutter";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { flagOn } from "@/auth/featureFlagStorage";
import { serializeError } from "serialize-error";
import { type FeatureFlag, FeatureFlags } from "@/auth/featureFlags";
import { waitFor } from "@testing-library/react";
import { sendErrorViaErrorReporter } from "@/offscreen/messenger/api";

// Disable automatic __mocks__ resolution
jest.mock("@/telemetry/logging", () => jest.requireActual("./logging.ts"));

jest.mock("@/auth/featureFlagStorage", () => ({
  flagOn: jest.fn().mockRejectedValue(new Error("Not mocked")),
}));

jest.mock("@/telemetry/telemetryHelpers", () => ({
  ...jest.requireActual("@/telemetry/telemetryHelpers"),
  mapAppUserToTelemetryUser: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/offscreen/messenger/api");

const flagOnMock = jest.mocked(flagOn);
const mockFlag = (flag: FeatureFlag) => {
  flagOnMock.mockImplementation(async (testFlag) => flag === testFlag);
};

describe("logging", () => {
  beforeEach(async () => {
    await clearLog();
    flagOnMock.mockReset();
    jest.mocked(sendErrorViaErrorReporter).mockReset();
  });

  test("appendEntry", async () => {
    flagOnMock.mockResolvedValue(false);
    await appendEntry(logEntryFactory());
    await expect(count()).resolves.toBe(1);
  });

  test("appendEntry with DISABLE_IDB_LOGGING flag on", async () => {
    mockFlag(FeatureFlags.DISABLE_IDB_LOGGING);
    await appendEntry(logEntryFactory());
    await expect(count()).resolves.toBe(0);
  });

  test("appendEntry db.add error handling", async () => {
    flagOnMock.mockResolvedValue(false);
    const error = new Error("Test db.add error");

    const idbSpy = jest.spyOn(require("idb"), "openDB");
    idbSpy.mockRejectedValue(error);

    await expect(appendEntry(logEntryFactory())).toResolve();

    await waitFor(() => {
      expect(sendErrorViaErrorReporter).toHaveBeenCalled();
    });

    expect(sendErrorViaErrorReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        error: serializeError(error),
        errorMessage: "Test db.add error",
        messageContext: expect.objectContaining({
          idbOperationName: "appendEntry",
          someMockReportErrorContext: 123,
          name: "Error",
        }),
      }),
    );
    idbSpy.mockRestore();
  });

  test("clearLog as logs", async () => {
    await appendEntry(logEntryFactory());
    await expect(count()).resolves.toBe(1);
    await clearLog();
    await expect(count()).resolves.toBe(0);
  });

  test("clearLog by mod id", async () => {
    const modId = registryIdFactory();

    await appendEntry(
      logEntryFactory({
        context: messageContextFactory({ modId }),
      }),
    );

    await appendEntry(logEntryFactory());

    await clearLog({ modId });

    await expect(count()).resolves.toBe(1);
  });

  test("sweepLogs", async () => {
    // Set up test log database that will trigger sweepLogs due to count > MAX_LOG_RECORDS
    // sweepLog assertions are all written in one test due to this expensive setup
    flagOnMock.mockResolvedValue(false);
    await Promise.all(
      array(logEntryFactory, 1300)().map(async (x) => {
        await appendEntry(x);
      }),
    );

    // Verify that when the DISABLE_IDB_LOGGING flag is on, the logs are not swept
    mockFlag(FeatureFlags.DISABLE_IDB_LOGGING);
    await sweepLogs();
    await expect(count()).resolves.toBe(1300);

    flagOnMock.mockResolvedValue(false);

    // Verify that sweeper will abort if timeout is hit
    const consoleWarnSpy = jest.spyOn(console, "warn");
    const originalTimeout = global.setTimeout;
    // Simulate timeout by mocking setTimeout to immediately call the abort signal
    const setTimeoutSpy = jest
      .spyOn(global, "setTimeout")
      .mockImplementation((fn) => originalTimeout(fn, 0));
    await sweepLogs();
    await expect(count()).resolves.toBeGreaterThan(1250);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Log sweep aborted due to timeout",
    );
    setTimeoutSpy.mockRestore();

    // Verify sweepLogs functionality
    await sweepLogs();
    await expect(count()).resolves.toBeLessThanOrEqual(930);
    // Increase timeout so test isn't flaky on CI due to slow append operation
  }, 25_000);

  test("getLogEntries by modId", async () => {
    const modId = registryIdFactory();

    await appendEntry(
      logEntryFactory({
        context: messageContextFactory({ modId }),
      }),
    );

    await appendEntry(logEntryFactory());

    await expect(getLogEntries({ modId })).resolves.toStrictEqual([
      expect.objectContaining({
        context: expect.objectContaining({ modId }),
      }),
    ]);
  });
});
