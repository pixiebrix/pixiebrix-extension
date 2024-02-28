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
import { addListener } from "@/auth/authStorage";
import { CachedFunction } from "webext-storage-cache";
import { expectContext } from "@/utils/expectContext";
import { fetchFeatureFlagsInBackground } from "@/background/messenger/api";

export async function fetchFeatureFlags(): Promise<readonly string[]> {
  expectContext("background");
  const client = await getApiClient();
  const { data, status, statusText } =
    await client.get<components["schemas"]["Me"]>("/api/me/");
  const { data } = await client.get<components["schemas"]["Me"]>("/api/me/");

  if (status >= 400) {
    console.warn(`Failed to fetch feature flags: ${status} ${statusText}`);
    return [];
  }

  return data.flags ?? [];
}

const featureFlags = new CachedFunction("getFeatureFlags", {
  updater: fetchFeatureFlagsInBackground,
  maxAge: {
    seconds: 30,
  },
});

export async function resetFeatureFlags(): Promise<void> {
  await featureFlags.delete();
}

export async function TEST_overrideFeatureFlags(
  flags: string[],
): Promise<void> {
  await featureFlags.applyOverride([], flags);
}

/**
 * Returns true if the specified flag is on for the current user.
 * @param flag the feature flag to check
 */
export async function flagOn(flag: string): Promise<boolean> {
  const flags = await featureFlags.get();
  return flags.includes(flag);
}

addListener(async () => {
  await resetFeatureFlags();
});
