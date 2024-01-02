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
  recordEvent,
  TEST_flushAll,
} from "@/background/telemetry";
import { appApiMock } from "@/testUtils/appApiMock";
import { type Event } from "@/telemetry/events";

jest.mock("@/store/syncFlags", () => ({
  syncFlagOn: jest.fn().mockResolvedValue(true),
}));

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
      recordEvent({ event: "TestEvent" as Event, data: {} }),
    );
    await Promise.all(recordTestEvents);

    const events = await flushEvents();
    expect(events).toHaveLength(100);
  });
});
