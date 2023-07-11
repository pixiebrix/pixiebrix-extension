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
} from "@/background/telemetry";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { appApiMock } from "@/testUtils/appApiMock";

beforeEach(() => {
  appApiMock.reset();
  appApiMock.onPost("/api/events/").reply(201, {});
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("recordEvent", () => {
  test("runs", async () => {
    await recordEvent({ event: "TestEvent", data: {} });
    const events = await flushEvents();
    expect(events.length).toEqual(1);
  });

  test("successfully persists concurrent telemetry events to local storage", async () => {
    // Easiest way to test race condition without having to mock
    const recordTestEvents = Array.from({ length: 100 }, async () =>
      recordEvent({ event: "TestEvent", data: {} })
    );
    await Promise.all(recordTestEvents);

    const events = await flushEvents();
    expect(events.length).toEqual(100);
  });

  test("record and flush brick run", async () => {
    const promise = recordBrickRun({
      blockId: registryIdFactory(),
      blueprintId: registryIdFactory(),
    });

    await jest.advanceTimersByTimeAsync(15_000);
    await promise;

    // FIXME: this runs before debounced call
    expect(appApiMock.history.post).toHaveLength(1);
  });

  test("split brick runs by blueprint id", async () => {
    const promise1 = recordBrickRun({
      blockId: registryIdFactory(),
      blueprintId: registryIdFactory(),
    });

    const promise2 = recordBrickRun({
      blockId: registryIdFactory(),
      blueprintId: null,
    });

    await jest.runAllTimersAsync();
    await Promise.all([promise1, promise2]);

    // FIXME: this runs before debounced call
    expect(appApiMock.history.post).toHaveLength(2);
  });
});
