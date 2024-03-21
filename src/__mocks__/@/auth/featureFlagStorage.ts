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

// noinspection ES6PreferShortImport -- Override mock
import { fetchFeatureFlags } from "../../../auth/featureFlagStorage";
import { addListener as addAuthStorageListener } from "@/auth/authStorage";

let flags: string[] | null = null;

// Helper to check if the test is using a mock or not
export const isMocked = true;

/**
 * Suggested that you call this in afterEach() in your tests:
 *    afterEach(async () => {
 *      await resetFeatureFlags();
 *    });
 */
export async function resetFeatureFlagsCache(): Promise<void> {
  flags = null;
  flags = await fetchFeatureFlags();
}

export async function TEST_overrideFeatureFlags(
  newFlags: string[],
): Promise<void> {
  flags = newFlags;
}

export async function TEST_deleteFeatureFlagsCache(
  newFlags: string[],
): Promise<void> {
  flags = null;
}

export async function flagOn(flag: string): Promise<boolean> {
  if (flags === null) {
    flags = await fetchFeatureFlags();
  }
  return flags?.includes(flag) ?? false;
}

addAuthStorageListener(async () => {
  await resetFeatureFlagsCache();
});
