/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { readReduxStorage, ReduxStorageKey } from "@/chrome";
import { SettingsState } from "@/store/settingsTypes";

const SETTINGS_STORAGE_KEY = "settings" as ReduxStorageKey;

/**
 * Read settings from local storage (without going through redux-persistor).
 */
export async function getSettingsSate(): Promise<SettingsState> {
  console.debug("Loading raw settings from storage");
  return (await readReduxStorage(SETTINGS_STORAGE_KEY, {})) as SettingsState;
}

export const persistSettingsConfig = {
  key: SETTINGS_STORAGE_KEY,
  storage: localStorage,
};
