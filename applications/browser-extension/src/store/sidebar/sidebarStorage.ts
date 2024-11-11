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

import { localStorage } from "redux-persist-webextension-storage";
import { type StorageInterface } from "@/store/StorageInterface";
import { type SidebarState } from "@/types/sidebarTypes";
import {
  readReduxStorage,
  setReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { initialSidebarState } from "@/store/sidebar/initialState";

/** @internal */
export const STORAGE_KEY = validateReduxStorageKey("persist:sidebar");

// The subset of the sidebar state that we persist
// See persistSidebarConfig.whitelist
type SidebarPersistedState = Pick<SidebarState, "closedTabs">;

/**
 * Reads the current state of the sidebar from storage (without going through redux-persist)
 */
export async function getSidebarState(): Promise<SidebarState> {
  const persistedSidebarState = await readReduxStorage<SidebarPersistedState>(
    STORAGE_KEY,
    {},
    initialSidebarState,
  );

  // Merge the persisted state with the initial state to ensure that all fields are present
  return { ...initialSidebarState, ...persistedSidebarState };
}

export async function saveSidebarState(
  state: SidebarPersistedState,
): Promise<void> {
  await setReduxStorage(STORAGE_KEY, state, 0);
}

export const persistSidebarConfig = {
  key: "sidebar",
  /**
   * We use localStorage instead of redux-persist-webextension-storage because we want to persist the sidebar state
   * @see StorageInterface
   */
  storage: localStorage as StorageInterface,
  version: 1,
  whitelist: ["closedTabs"],
};
