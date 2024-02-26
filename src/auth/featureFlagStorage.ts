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

import { StorageItem } from "webext-storage";
import { getApiClient } from "@/data/service/apiClient";
import { type components } from "@/types/swagger";

const TIME_TO_EXPIRATION_MS = 30_000; // 30 seconds

const featureFlagStorage = new StorageItem("featureFlags", {
  defaultValue: {
    flags: [] as string[],
    lastFetchedTime: 0,
  },
});

export async function TEST_setFeatureFlags(flags: string[]): Promise<void> {
  await featureFlagStorage.set({ flags, lastFetchedTime: Date.now() });
}

export async function resetFeatureFlags(): Promise<void> {
  await featureFlagStorage.set({ flags: [], lastFetchedTime: 0 });
}

/**
 * Returns true if the specified flag is on for the current user.
 * @param flag the feature flag to check
 */
export async function flagOn(flag: string): Promise<boolean> {
  const { flags: cachedFlags = [], lastFetchedTime = 0 } =
    (await featureFlagStorage.get()) ?? {};
  let flags = cachedFlags;
  if (Date.now() - lastFetchedTime > TIME_TO_EXPIRATION_MS) {
    const client = await getApiClient();
    const { data, status } =
      await client.get<components["schemas"]["Me"]>("/api/me/");
    if (status >= 400) {
      console.debug("Failed to fetch feature flags");
    } else {
      const newFlags = [...(data.flags ?? [])];
      await featureFlagStorage.set({
        flags: newFlags,
        lastFetchedTime: Date.now(),
      });
      flags = newFlags;
    }
  }

  return flags.includes(flag);
}
