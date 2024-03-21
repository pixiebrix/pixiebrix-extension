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

import { getApiClient } from "@/data/service/apiClient";
import { type components } from "@/types/swagger";
import { addListener as addAuthStorageListener } from "@/auth/authStorage";
import { CachedFunction } from "webext-storage-cache";
import { expectContext } from "@/utils/expectContext";
import { fetchFeatureFlagsInBackground } from "@/background/messenger/strict/api";
import { memoizeUntilSettled } from "@/utils/promiseUtils";

/**
 * DO NOT CALL DIRECTLY. Call via fetchFeatureFlagsInBackground instead to memoize/de-duplicate calls initiated
 * from multiple contexts.
 * @see fetchFeatureFlagsInBackground
 */
// Safe to memoize in-memory because the background page/worker is reloaded when the authenticated user changes.
// When the user changes, the background page/worker is reloaded, the memoizeUntilSettled cache is cleared so the
// next call to fetchFeatureFlagsInBackground will fetch the using the new user's credentials.
export const fetchFeatureFlags = memoizeUntilSettled(
  async (): Promise<string[]> => {
    expectContext(
      "background",
      "fetchFeatureFlags should be called via fetchFeatureFlagsInBackground",
    );
    const client = await getApiClient();
    const { data } = await client.get<components["schemas"]["Me"]>("/api/me/");
    return [...(data?.flags ?? [])];
  },
);

const featureFlags = new CachedFunction("getFeatureFlags", {
  updater: fetchFeatureFlagsInBackground,
});

/**
 * Resets the feature flags cache and eagerly fetches the latest flags from the server.
 */
export async function resetFeatureFlagsCache(): Promise<void> {
  await featureFlags.delete();
  // Eagerly re-fetch the flags so that the next call to `flagOn` doesn't have to wait for the flags to be fetched.
  await featureFlags.get();
}

export async function TEST_overrideFeatureFlags(
  flags: string[],
): Promise<void> {
  await featureFlags.applyOverride([], flags);
}

/**
 * Returns true if the specified flag is on for the current user. Fetches the flags if they are not already cached.
 * @param flag the feature flag to check
 */
export async function flagOn(flag: string): Promise<boolean> {
  const flags = await featureFlags.get();
  return flags.includes(flag);
}

addAuthStorageListener(async () => {
  await resetFeatureFlagsCache();
});
