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

import { tryParseSessionStorageKey } from "../platform/state/stateHelpers";
import type { RegistryId } from "@/types/registryTypes";

/**
 * Delete synchronized mod variables for the given tab id to free up memory.
 * @internal
 */
export async function deleteSynchronizedModVariablesForTab(
  tabId: number,
): Promise<void> {
  const values = await browser.storage.session.get();
  const matches = Object.keys(values).filter(
    (x) => tryParseSessionStorageKey(x)?.tabId === tabId,
  );
  if (matches.length > 0) {
    await browser.storage.session.remove(matches);
  }
}

/**
 * Delete synchronized mod variables for the given tab mod to free up memory.
 */
export async function deleteSynchronizedModVariablesForMod(
  modId: RegistryId,
): Promise<void> {
  const values = await browser.storage.session.get();
  const matches = Object.keys(values).filter(
    (x) => tryParseSessionStorageKey(x)?.modId === modId,
  );
  if (matches.length > 0) {
    await browser.storage.session.remove(matches);
  }
}

export function initStateControllerListeners(): void {
  browser.tabs.onRemoved.addListener(deleteSynchronizedModVariablesForTab);
}
