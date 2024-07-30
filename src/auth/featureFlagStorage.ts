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

import { CachedFunction } from "webext-storage-cache";
import { expectContext } from "@/utils/expectContext";
import { fetchFeatureFlagsInBackground } from "@/background/messenger/api";
import { getMe } from "@/data/service/backgroundApi";
import { addAuthListener as addAuthStorageListener } from "@/auth/authStorage";

/**
 * Fetch the latest feature flags from the server.
 * @see fetchFeatureFlagsInBackground
 * @deprecated call via fetchFeatureFlagsInBackground instead to memoize/de-duplicate calls initiated
 * from multiple contexts.
 */
// getMe is memoized in-memory, so don't need to also memoizeUntilSettled this method
export async function fetchFeatureFlags(): Promise<string[]> {
  expectContext(
    "background",
    "fetchFeatureFlags should be called via fetchFeatureFlagsInBackground",
  );
  const data = await getMe();
  return [...(data?.flags ?? [])];
}

const featureFlags = new CachedFunction("getFeatureFlags", {
  updater: fetchFeatureFlagsInBackground,
});

/**
 * Resets the feature flags cache and eagerly fetches the latest flags from the server.
 *
 * The background page resets the cache via addAuthStorageListener.
 *
 * For Jest tests, use TEST_deleteFeatureFlagsCache instead, which doesn't eagerly fetch the flags.
 *
 * @see TEST_deleteFeatureFlagsCache
 */
export async function resetFeatureFlagsCache(): Promise<void> {
  // XXX: on session startup, we might consider instead calling featureFlags.getFresh() which will update the value,
  // but flagOn will still return the old value until the promise resolves.
  // https://github.com/fregante/webext-storage-cache/blob/main/source/cached-function.md#cachedfunctiongetfresharguments
  await featureFlags.delete();
  // Eagerly re-fetch the flags so that the next call to `flagOn` doesn't have to wait for the flags to be fetched.
  await featureFlags.get();
}

/**
 * Test utility to clear the feature flags cache. Use this in afterEach() in your tests. NOTE: in tests, the
 * manual mock `__mocks__` implementation is automatically used, not this file.
 * @see resetFeatureFlagsCache
 */
export async function TEST_deleteFeatureFlagsCache(): Promise<void> {
  await featureFlags.delete();
}

/**
 * Test utility to directly set the flags cache. NOTE: in tests, the manual mock `__mocks__` implementation is
 * automatically used, not this file.
 */
export async function TEST_overrideFeatureFlags(
  flags: string[],
): Promise<void> {
  await featureFlags.applyOverride([], flags);
}

/**
 * Returns true if the specified flag is on for the current user. Fetches the flags if they are not already cached.
 *
 * In React code, use useFlags instead.
 *
 * @param flag the feature flag to check
 * @see useFlags
 */
export async function flagOn(flag: string): Promise<boolean> {
  const flags = await featureFlags.get();
  return flags.includes(flag);
}

export function initFeatureFlagBackgroundListeners(): void {
  // Only need to listen in the background because CachedFunction uses browser.storage.local, which
  // is shared across all contexts
  expectContext("background");
  addAuthStorageListener(resetFeatureFlagsCache);
}
