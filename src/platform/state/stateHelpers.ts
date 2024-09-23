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

import type { RegistryId } from "@/types/registryTypes";

/**
 * @file Cross-context helper methods for state protocol.
 */

// The exact prefix is not important. Pick one that is unlikely to collide with other keys.
const keyPrefix = "#modVariables/";

type StorageSlot = { modId: RegistryId; tabId?: number };

/**
 * Returns the session storage key for a mod's variables.
 * @see tryParseSessionStorageKey
 */
export function getSessionStorageKey({ modId, tabId }: StorageSlot): string {
  if (tabId) {
    return `${keyPrefix}:${JSON.stringify({
      modId,
      tabId,
    })}`;
  }

  return `${keyPrefix}:${JSON.stringify({ modId })}`;
}

/**
 * Returns the parsed storage slot from a session storage key, or undefined if the key is not parseable.
 * @see getSessionStorageKey
 */
export function tryParseSessionStorageKey(
  key: string,
): StorageSlot | undefined {
  if (key.startsWith(keyPrefix)) {
    try {
      return JSON.parse(key.slice(keyPrefix.length + 1)) as StorageSlot;
    } catch {
      // Return undefined if the key is not parseable
    }
  }
}
