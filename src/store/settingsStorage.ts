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
import { mapValues } from "lodash";

const SETTINGS_STORAGE_KEY = "persist:settings" as ReduxStorageKey;

/**
 * Read settings from local storage (without going through redux-persistor).
 */
export async function getSettingsState(): Promise<SettingsState> {
  const rawSettings = await readReduxStorage(SETTINGS_STORAGE_KEY, {});
  const parsedSettings = mapValues(rawSettings, (setting) =>
    JSON.parse(setting)
  ) as SettingsState;
  // `persist` library stores values as stringified values
  console.debug("Loading persisted settings directly from storage", {
    rawSettings,
    parsedSettings,
  });
  return parsedSettings;
}

export const persistSettingsConfig = {
  key: "settings",
  storage: localStorage,
};
