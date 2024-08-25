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
  flushEvents,
  recordEvent,
  TEST_flushAll,
} from "@/background/telemetry";
import { appApiMock } from "@/testUtils/appApiMock";
import { type TelemetryEvent } from "@/telemetry/telemetryTypes";
import { API_PATHS } from "@/data/service/urlPaths";

const EXPECTED_RUNTIME_ID = "abc123";
const expectedManifestValues = {
  version_name: "1.0.0",
  version: "1.0.0",
  manifest_version: "3",
};

beforeEach(async () => {
  appApiMock.reset();
  appApiMock.onPost(API_PATHS.EVENTS).reply(201, {});

  Object.defineProperty(global, "navigator", {
    value: {
      ...global.navigator,
      userAgent: "Chrome",
      vendor: "Google Inc.",
    },
    writable: true,
  });

  browser.runtime.id = EXPECTED_RUNTIME_ID;
  browser.runtime.getManifest = jest
    .fn()
    .mockReturnValue(expectedManifestValues);

  await TEST_flushAll();
});

describe("recordEvent", () => {
  test("runs", async () => {
    await recordEvent({ event: "TestEvent" as TelemetryEvent, data: {} });
    const events = await flushEvents();
    expect(events).toHaveLength(1);
  });

  test("includes expected default properties", async () => {
    const testEvent = { event: "TestEvent" as TelemetryEvent, data: {} };
    await recordEvent(testEvent);
    const events = await flushEvents();
    expect(events[0]).toMatchObject({
      event: "TestEvent",
      data: {
        manifestVersion: expectedManifestValues.manifest_version,
        version: expectedManifestValues.version,
        versionName: expectedManifestValues.version_name,
        runtimeId: EXPECTED_RUNTIME_ID,
      },
    });
  });

  test("successfully persists concurrent telemetry events to local storage", async () => {
    // Easiest way to test race condition without having to mock
    const recordTestEvents = Array.from({ length: 100 }, async () =>
      recordEvent({ event: "TestEvent" as TelemetryEvent, data: {} }),
    );
    await Promise.all(recordTestEvents);

    const events = await flushEvents();
    expect(events).toHaveLength(100);
  });
});
