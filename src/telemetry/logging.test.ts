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
  reportToRollbar,
} from "@/telemetry/logging";
import type Rollbar from "rollbar";
import { flagOn } from "@/auth/token";
import { getRollbar } from "@/telemetry/initRollbar";
import {
  logEntryFactory,
  messageContextFactory,
} from "@/testUtils/factories/logFactories";
import { array } from "cooky-cutter";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";

jest.unmock("@/telemetry/logging");

jest.mock("@/auth/token", () => ({
  flagOn: jest.fn().mockRejectedValue(new Error("Not mocked")),
}));

const flagOnMock = jest.mocked(flagOn);

jest.mock("@/telemetry/initRollbar", () => ({
  getRollbar: jest.fn(),
}));

const rollbarErrorMock = jest.fn();
jest.mocked(getRollbar).mockResolvedValue({
  error: rollbarErrorMock,
} as unknown as Rollbar);

afterEach(async () => {
  await clearLog();
  flagOnMock.mockReset();
  rollbarErrorMock.mockReset();
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
      })
    );

    await appendEntry(logEntryFactory());

    await clearLog({ blueprintId });

    await expect(count()).resolves.toBe(1);
  });

  test("sweep", async () => {
    await Promise.all(
      array(logEntryFactory, 1500)().map(async (x) => {
        await appendEntry(x);
      })
    );

    await sweepLogs();

    await expect(count()).resolves.toBe(937);
  });

  test("getLogEntries by blueprintId", async () => {
    const blueprintId = registryIdFactory();

    await appendEntry(
      logEntryFactory({
        context: messageContextFactory({ blueprintId }),
      })
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

    await reportToRollbar(new Error("test"), null, null);

    expect(flagOnMock).toHaveBeenCalledExactlyOnceWith(
      "rollbar-disable-report"
    );
    expect(rollbarErrorMock).toHaveBeenCalledOnce();
  });

  test("disable rollbar reporting", async () => {
    flagOnMock.mockResolvedValue(true);

    await reportToRollbar(new Error("test"), null, null);

    expect(flagOnMock).toHaveBeenCalledExactlyOnceWith(
      "rollbar-disable-report"
    );
    expect(rollbarErrorMock).not.toHaveBeenCalledOnce();
  });
});
