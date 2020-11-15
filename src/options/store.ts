/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
// @ts-ignore: redux-persist-webextension-storage has no type definitions
import { localStorage } from "redux-persist-webextension-storage";
import {
  optionsSlice,
  OptionsState,
  servicesSlice,
  ServicesState,
  settingsSlice,
  SettingsState,
} from "./slices";
import { createLogger } from "redux-logger";
import { connectRouter, routerMiddleware } from "connected-react-router";
import { createHashHistory } from "history";

const persistOptionsConfig = {
  key: "extensionOptions",
  storage: localStorage,
};

export const hashHistory = createHashHistory({ hashType: "slash" });

const persistServicesConfig = {
  key: "servicesOptions",
  storage: localStorage,
};

const persistSettingsConfig = {
  key: "settings",
  storage: localStorage,
};

export interface RootState {
  options: OptionsState;
  services: ServicesState;
  settings: SettingsState;
}

const store = configureStore({
  reducer: {
    router: connectRouter(hashHistory),
    options: persistReducer(persistOptionsConfig, optionsSlice.reducer),
    services: persistReducer(persistServicesConfig, servicesSlice.reducer),
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
  },
  middleware: [routerMiddleware(hashHistory), createLogger()],
  devTools: true,
});

export const persistor = persistStore(store);

export default store;
