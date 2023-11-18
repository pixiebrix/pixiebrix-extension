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
  flushEvents,
  recordBrickRun,
  recordEvent,
  TEST_flushAll,
} from "@/background/telemetry";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { appApiMock } from "@/testUtils/appApiMock";
import { syncFlagOn } from "@/store/syncFlags";
import { type Event } from "@/telemetry/events";

jest.mock("@/store/syncFlags", () => ({
  syncFlagOn: jest.fn().mockResolvedValue(true),
}));

const syncFlagOnMock = jest.mocked(syncFlagOn);

beforeEach(async () => {
  appApiMock.reset();
  appApiMock.onPost("/api/events/").reply(201, {});

  // eslint-disable-next-line new-cap -- test file
  await TEST_flushAll();
});

describe("recordEvent", () => {
  test("runs", async () => {
    await recordEvent({ event: "TestEvent" as Event, data: {} });
    const events = await flushEvents();
    expect(events).toHaveLength(1);
  });

  test("successfully persists concurrent telemetry events to local storage", async () => {
    // Easiest way to test race condition without having to mock
    const recordTestEvents = Array.from({ length: 100 }, async () =>
      recordEvent({ event: "TestEvent" as Event, data: {} })
    );
    await Promise.all(recordTestEvents);

    const events = await flushEvents();
    expect(events).toHaveLength(100);
  });

  test("skip if feature flag off", async () => {
    syncFlagOnMock.mockReturnValue(false);

    const promise = recordBrickRun({
      blockId: registryIdFactory(),
      blueprintId: registryIdFactory(),
    });

    // eslint-disable-next-line new-cap -- test method
    await TEST_flushAll();

    await promise;

    expect(appApiMock.history.post).toHaveLength(0);
  });

  test("skip if enterprise restricted user", async () => {
    syncFlagOnMock.mockReturnValue(true);

    const promise = recordBrickRun({
      blockId: registryIdFactory(),
      blueprintId: registryIdFactory(),
    });

    // eslint-disable-next-line new-cap -- test method
    await TEST_flushAll();

    await promise;

    expect(appApiMock.history.post).toHaveLength(0);
  });

  test("record and flush brick run", async () => {
    syncFlagOnMock.mockImplementation(
      (flag: string) => flag === "telemetry-bricks"
    );

    const promise = recordBrickRun({
      blockId: registryIdFactory(),
      blueprintId: registryIdFactory(),
    });

    // eslint-disable-next-line new-cap -- test method
    await TEST_flushAll();

    await promise;

    expect(appApiMock.history.post).toHaveLength(1);
  });

  test("split brick runs by blueprint id", async () => {
    syncFlagOnMock.mockImplementation(
      (flag: string) => flag === "telemetry-bricks"
    );

    const promise1 = recordBrickRun({
      blockId: registryIdFactory(),
      blueprintId: registryIdFactory(),
    });

    const promise2 = recordBrickRun({
      blockId: registryIdFactory(),
      blueprintId: null,
    });

    // eslint-disable-next-line new-cap -- test method
    await TEST_flushAll();

    await Promise.all([promise1, promise2]);

    expect(appApiMock.history.post).toHaveLength(1);
    expect(JSON.parse(appApiMock.history.post[0].data as string)).toStrictEqual(
      {
        events: expect.toBeArrayOfSize(2),
      }
    );
  });
});
