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
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { initialSidebarState } from "@/sidebar/sidebarSlice";

const STORAGE_KEY = validateReduxStorageKey("persist:sidebar");

export async function getClosedTabsState(): Promise<SidebarState> {
  return readReduxStorage<SidebarState>(STORAGE_KEY, {}, initialSidebarState);
}

export const persistSidebarConfig = {
  key: "sidebar",
  /** We use localStorage instead of redux-persist-webextension-storage because we want to persist the sidebar state
   * @see StorageInterface */
  storage: localStorage as StorageInterface,
  version: 1,
  whitelist: ["closedTabs"],
};
