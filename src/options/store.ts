/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import { localStorage } from "redux-persist-webextension-storage";
import {
  optionsSlice,
  OptionsState,
  servicesSlice,
  ServicesState,
  settingsSlice,
  SettingsState,
  workshopSlice,
  WorkshopState,
} from "./slices";
import { createLogger } from "redux-logger";
import { connectRouter, routerMiddleware } from "connected-react-router";
import { createHashHistory } from "history";
import { boolean } from "@/utils";

const REDUX_DEV_TOOLS: boolean = boolean(process.env.REDUX_DEV_TOOLS);

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
  workshop: WorkshopState;
}

const middleware = [routerMiddleware(hashHistory)];
if (process.env.NODE_ENV === "development") {
  // Allow tree shaking of logger in production
  // https://github.com/LogRocket/redux-logger/issues/6
  middleware.push(createLogger());
}

const store = configureStore({
  reducer: {
    router: connectRouter(hashHistory),
    options: persistReducer(persistOptionsConfig, optionsSlice.reducer),
    services: persistReducer(persistServicesConfig, servicesSlice.reducer),
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    workshop: persistReducer(persistSettingsConfig, workshopSlice.reducer),
  },
  middleware,
  devTools: REDUX_DEV_TOOLS,
});

export const persistor = persistStore(store);

export default store;
