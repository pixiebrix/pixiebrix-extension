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
import { once } from "lodash";
import { addListener } from "@/auth/authStorage";
import { CachedFunction } from "webext-storage-cache";

const featureFlags = new CachedFunction("getFeatureFlags", {
  async updater(): Promise<string[]> {
    const client = await getApiClient();
    const { data, status, statusText } =
      await client.get<components["schemas"]["Me"]>("/api/me/");

    if (status >= 400) {
      console.debug(`Failed to fetch feature flags: ${status} ${statusText}`);
      return [];
    }

    return [...(data.flags ?? [])];
  },
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

const init = once(() => {
  addListener(async () => {
    await resetFeatureFlags();
  });
});

init();
