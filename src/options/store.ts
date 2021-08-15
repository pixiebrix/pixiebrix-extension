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
import { persistReducer, persistStore } from "redux-persist";
import { localStorage } from "redux-persist-webextension-storage";
import {
  optionsSlice,
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
import { OptionsState, persistOptionsConfig } from "@/store/extensions";
import { persistServicesConfig } from "@/store/services";

const REDUX_DEV_TOOLS: boolean = boolean(process.env.REDUX_DEV_TOOLS);

export const hashHistory = createHashHistory({ hashType: "slash" });

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
    // XXX: settings and workshop use the same persistor config?
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    workshop: persistReducer(persistSettingsConfig, workshopSlice.reducer),
  },
  middleware,
  devTools: REDUX_DEV_TOOLS,
});

export const persistor = persistStore(store);

export default store;
