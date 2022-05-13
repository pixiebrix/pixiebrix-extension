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

import { getLastCspViolation } from "./cspCatcher";

function dispatchCspViolationEvent(blockedURI: string): Event {
  const event = new Event("securitypolicyviolation");
  (event as any).blockedURI = blockedURI;
  document.dispatchEvent(event);
  return event;
}

describe("getLastCspViolation", () => {
  test("should resolve with undefined", async () => {
    await expect(
      getLastCspViolation("https://example.com")
    ).resolves.toBeUndefined();
  });

  test("should ignore violations for unrelated URLs", async () => {
    const failedFetchUrl = "https://example.com/api";
    const browserCspEventUrl = "https://example.com/api2"; // Different url
    const violationPromise = getLastCspViolation(failedFetchUrl);
    dispatchCspViolationEvent(browserCspEventUrl);
    await expect(violationPromise).resolves.toBeUndefined();
  });

  test("should catch violations for exact URL matches", async () => {
    const failedFetchUrl = "https://example.com/api";
    const browserCspEventUrl = failedFetchUrl; // Same URL
    const violationPromise = getLastCspViolation(failedFetchUrl);
    const event = dispatchCspViolationEvent(browserCspEventUrl);
    await expect(violationPromise).resolves.toBe(event);
  });
});
