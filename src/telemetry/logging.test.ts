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
} from "@/telemetry/logging";
import {
  logEntryFactory,
  messageContextFactory,
} from "@/testUtils/factories/logFactories";
import { array } from "cooky-cutter";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";

jest.unmock("@/telemetry/logging");

afterEach(async () => {
  await clearLog();
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
});
