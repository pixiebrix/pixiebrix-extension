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

// Use ./featureFlagStorage relative import to avoid testing the manual `__mocks__` implementation. There's no easy
// way to unmock the module in the test file: https://github.com/jestjs/jest/issues/2649
import {
  fetchFeatureFlags,
  flagOn,
  initFeatureFlagBackgroundListeners,
  TEST_deleteFeatureFlagsCache,
  TEST_overrideFeatureFlags,
} from "./featureFlagStorage";

import { appApiMock } from "@/testUtils/appApiMock";
import {
  TEST_clearListeners as clearAuthStorageListeners,
  TEST_setAuthData,
  TEST_triggerListeners,
} from "@/auth/authStorage";
import { tokenAuthDataFactory } from "@/testUtils/factories/authFactories";
import { fetchFeatureFlagsInBackground } from "@/background/messenger/api";

describe("featureFlags", () => {
  beforeEach(async () => {
    clearAuthStorageListeners();

    // Wire up the real fetch function, so we can mock the api responses
    jest
      .mocked(fetchFeatureFlagsInBackground)
      .mockImplementation(fetchFeatureFlags);
    appApiMock.reset();
    appApiMock.onGet("/api/me/").reply(200, {
      flags: [],
    });
  });

  afterEach(async () => {
    await TEST_deleteFeatureFlagsCache();
  });

  it("not using mock", () => {
    expect("mock" in flagOn).toBeFalse();
  });

  it("returns true if flag is present", async () => {
    await TEST_overrideFeatureFlags([
      "test-flag",
      "test-other-flag",
      "test-other-flag-2",
    ]);
    await expect(flagOn("test-flag")).resolves.toBe(true);
  });

  it("returns false if flag is not present", async () => {
    await TEST_overrideFeatureFlags(["test-other-flag", "test-other-flag-2"]);
    await expect(flagOn("test-flag")).resolves.toBe(false);
  });

  it("fetches flags on initial storage state", async () => {
    appApiMock.onGet("/api/me/").reply(200, {
      flags: ["test-flag"],
    });

    await expect(flagOn("test-flag")).resolves.toBe(true);
    expect(appApiMock.history.get).toHaveLength(1);
  });

  it("does not fetch if flags have been updated recently", async () => {
    await TEST_overrideFeatureFlags(["test-flag"]);
    await expect(flagOn("test-flag")).resolves.toBe(true);
    expect(appApiMock.history.get).toHaveLength(0);
  });

  it("only fetches once if multiple calls are made", async () => {
    appApiMock.onGet("/api/me/").reply(200, {
      flags: ["test-flag"],
    });

    await expect(flagOn("test-flag")).resolves.toBe(true);
    await expect(flagOn("test-flag")).resolves.toBe(true);
    await expect(flagOn("test-flag")).resolves.toBe(true);
    expect(appApiMock.history.get).toHaveLength(1);
  });

  it("fetches flags again if auth is reset in between calls", async () => {
    // Mimic listener added by background.ts
    initFeatureFlagBackgroundListeners();

    appApiMock.onGet("/api/me/").reply(200, {
      flags: ["test-flag", "secret-flag"],
    });

    await expect(flagOn("secret-flag")).resolves.toBe(true);
    await expect(flagOn("secret-flag")).resolves.toBe(true);
    expect(appApiMock.history.get).toHaveLength(1);

    const authData = tokenAuthDataFactory();
    await TEST_setAuthData(authData);
    TEST_triggerListeners(authData);

    // New user doesn't have secret flag
    appApiMock.onGet("/api/me/").reply(200, {
      flags: ["test-flag"],
    });

    await expect(flagOn("secret-flag")).resolves.toBe(false);
    await expect(flagOn("secret-flag")).resolves.toBe(false);
    expect(appApiMock.history.get).toHaveLength(2);
  });
});
