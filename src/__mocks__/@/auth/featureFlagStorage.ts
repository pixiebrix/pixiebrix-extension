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

export async function resetFeatureFlags(): Promise<void> {
  flags = null;
}

export async function TEST_overrideFeatureFlags(
  newFlags: string[],
): Promise<void> {
  flags = newFlags;
}

export async function flagOn(flag: string): Promise<boolean> {
  if (flags === null) {
    flags = await fetchFeatureFlags();
  }
  return flags?.includes(flag) ?? false;
}

addAuthStorageListener(async () => {
  await resetFeatureFlags();
});

afterEach(async () => {
  await resetFeatureFlags();
});
