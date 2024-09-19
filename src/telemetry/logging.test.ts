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
  reportToApplicationErrorTelemetry,
} from "@/telemetry/logging";
import {
  logEntryFactory,
  messageContextFactory,
} from "@/testUtils/factories/logFactories";
import { array } from "cooky-cutter";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { flagOn } from "@/auth/featureFlagStorage";
import Reason = chrome.offscreen.Reason;
import ManifestV3 = chrome.runtime.ManifestV3;
import { serializeError } from "serialize-error";
import { type FeatureFlag, FeatureFlags } from "@/auth/featureFlags";

// Disable automatic __mocks__ resolution
jest.mock("@/telemetry/logging", () => jest.requireActual("./logging.ts"));

jest.mock("@/auth/featureFlagStorage", () => ({
  flagOn: jest.fn().mockRejectedValue(new Error("Not mocked")),
}));

jest.mock("@/telemetry/telemetryHelpers", () => ({
  ...jest.requireActual("@/telemetry/telemetryHelpers"),
  mapAppUserToTelemetryUser: jest.fn().mockResolvedValue({}),
}));

global.chrome = {
  ...global.chrome,
  runtime: {
    ...global.chrome.runtime,
    getContexts: jest.fn(async () => []),
    getManifest: jest.fn(() => ({ manifest_version: 3 }) as ManifestV3),
    getURL: jest.fn((path) => path),
    ContextType: {
      OFFSCREEN_DOCUMENT:
        "offscreen_document" as typeof global.chrome.runtime.ContextType.OFFSCREEN_DOCUMENT,
    } as typeof global.chrome.runtime.ContextType,
  },
  offscreen: {
    ...global.chrome.offscreen,
    Reason: {
      BLOBS: "blobs" as typeof global.chrome.offscreen.Reason.BLOBS,
    } as typeof Reason,
    createDocument: jest.fn(),
  },
};

const flagOnMock = jest.mocked(flagOn);
const mockFlag = (flag: FeatureFlag) => {
  flagOnMock.mockImplementation(async (testFlag) => flag === testFlag);
};

const sendMessageSpy = jest.spyOn(global.chrome.runtime, "sendMessage");

afterEach(async () => {
  await clearLog();
  flagOnMock.mockReset();
  sendMessageSpy.mockReset();
});

describe("logging", () => {
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

  test("sweep", async () => {
    flagOnMock.mockResolvedValue(false);
    await Promise.all(
      array(logEntryFactory, 1500)().map(async (x) => {
        await appendEntry(x);
      }),
    );

    // Verify that when the DISABLE_IDB_LOGGING flag is on, the logs are not swept
    mockFlag(FeatureFlags.DISABLE_IDB_LOGGING);
    await sweepLogs();
    await expect(count()).resolves.toBe(1500);

    flagOnMock.mockResolvedValue(false);
    await sweepLogs();
    await expect(count()).resolves.toBe(937);
    // Increase timeout so test isn't flakey on CI due to slow append operation
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

  test("allow Application error telemetry reporting", async () => {
    flagOnMock.mockResolvedValue(false);

    const nestedError = new Error("nested cause");
    const reportedError = new Error("test", { cause: nestedError });
    await reportToApplicationErrorTelemetry(reportedError, {}, "error message");

    expect(flagOnMock).toHaveBeenCalledExactlyOnceWith(
      "application-error-telemetry-disable-report",
    );
    expect(sendMessageSpy).toHaveBeenCalledOnce();
    expect(sendMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        target: "offscreen-doc",
        data: expect.objectContaining({
          error: serializeError(reportedError),
          errorMessage: "error message",
          messageContext: expect.objectContaining({
            cause: nestedError,
            code: undefined,
            extensionVersion: "1.5.2",
            name: "Error",
            stack: expect.any(String),
          }),
        }),
      }),
    );
  });

  test("disable Application error telemetry reporting", async () => {
    mockFlag(FeatureFlags.APPLICATION_ERROR_TELEMETRY_DISABLE_REPORT);

    await reportToApplicationErrorTelemetry(new Error("test"), {}, "");

    expect(sendMessageSpy).not.toHaveBeenCalled();
  });
});
