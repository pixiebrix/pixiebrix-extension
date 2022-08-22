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

import {
  recordEvent,
  TELEMETRY_EVENT_BUFFER_KEY,
  UserTelemetryEvent,
} from "@/background/telemetry";
import { readStorage, setStorage } from "@/chrome";

beforeEach(async () => {
  await setStorage(TELEMETRY_EVENT_BUFFER_KEY, []);
});

describe("recordEvent", () => {
  test("runs", async () => {
    await recordEvent({ event: "TestEvent", data: {} });
    const persistedEvents =
      (await readStorage<UserTelemetryEvent[]>(TELEMETRY_EVENT_BUFFER_KEY)) ??
      [];
    expect(persistedEvents.length).toEqual(1);
  });

  test("successfully persists concurrent telemetry events to local storage", async () => {
    await Promise.all([
      recordEvent({ event: "TestEventA", data: {} }),
      recordEvent({ event: "TestEventB", data: {} }),
    ]);

    const persistedEvents =
      (await readStorage<UserTelemetryEvent[]>(TELEMETRY_EVENT_BUFFER_KEY)) ??
      [];
    expect(persistedEvents.length).toEqual(2);
  });
});
