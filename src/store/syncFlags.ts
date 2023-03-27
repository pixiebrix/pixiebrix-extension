/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { getUserData, addListener as addAuthListener } from "@/auth/token";
import { expectContext } from "@/utils/expectContext";
import { type UserData } from "@/auth/authTypes";

let flags = new Set<string>();

async function initFlags() {
  expectContext("extension");
  const { flags: initialFlags = [] } = await getUserData();
  flags = new Set(initialFlags);
}

addAuthListener(async ({ flags: newFlags = [] }: UserData) => {
  flags = new Set(newFlags);
});

/**
 * Synchronously check if a flag is on. Prefer useFlags and token.ts:flagOn where possible.
 * @param flag the flag to check
 * @see useFlags
 * @see flagOn
 */
export function syncFlagOn(flag: string): boolean {
  return flags.has(flag);
}

// Load flags on initial module load
void initFlags();
