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
import { type SettingsState } from "./settingsTypes";
import { expectContext } from "../../utils/expectContext";
import {
  readReduxStorage,
  setReduxStorage,
  validateReduxStorageKey,
} from "../../utils/storageUtils";
import { initialSettingsState } from "./settingsSlice";
import { type StorageInterface } from "../StorageInterface";
import { createMigrate } from "redux-persist";
import { migrations } from "./settingsMigrations";
import { getMaxMigrationsVersion } from "../migratePersistedState";

const SETTINGS_STORAGE_KEY = validateReduxStorageKey("persist:settings");

/**
 * Read persisted settings state directly from local storage
 */
export async function getSettingsState(): Promise<SettingsState> {
  expectContext("extension");
  return readReduxStorage(
    SETTINGS_STORAGE_KEY,
    migrations,
    initialSettingsState,
  );
}

/**
 * Save settings to local storage (without going through redux-persistor).
 */
export async function saveSettingsState(state: SettingsState): Promise<void> {
  await setReduxStorage(
    SETTINGS_STORAGE_KEY,
    state,
    getMaxMigrationsVersion(migrations),
  );
}

export const persistSettingsConfig = {
  key: "settings",
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 4,
  migrate: createMigrate(migrations, { debug: Boolean(process.env.DEBUG) }),
};
