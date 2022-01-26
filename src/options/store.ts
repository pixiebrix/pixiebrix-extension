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

import { configureStore, Middleware } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import { localStorage } from "redux-persist-webextension-storage";
import { createLogger } from "redux-logger";
import { connectRouter, routerMiddleware } from "connected-react-router";
import { createHashHistory } from "history";
import { boolean } from "@/utils";
import { OptionsState } from "@/store/extensionsTypes";
import servicesSlice, {
  persistServicesConfig,
  ServicesState,
} from "@/store/servicesSlice";
import {
  installedPageSlice,
  InstalledPageState,
} from "./pages/installed/installedPageSlice";
import { appApi } from "@/services/api";
import { setupListeners } from "@reduxjs/toolkit/dist/query/react";
import extensionsSlice from "@/store/extensionsSlice";
import settingsSlice, { SettingsState } from "@/store/settingsSlice";
import workshopSlice, { WorkshopState } from "@/store/workshopSlice";
import { persistExtensionOptionsConfig } from "@/store/extensionsStorage";

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
  installedPage: InstalledPageState;
}

const conditionalMiddleware: Middleware[] = [];
if (process.env.NODE_ENV === "development") {
  // Allow tree shaking of logger in production
  // https://github.com/LogRocket/redux-logger/issues/6
  conditionalMiddleware.push(createLogger());
}

const store = configureStore({
  reducer: {
    router: connectRouter(hashHistory),
    options: persistReducer(
      persistExtensionOptionsConfig,
      extensionsSlice.reducer
    ),
    services: persistReducer(persistServicesConfig, servicesSlice.reducer),
    // XXX: settings and workshop use the same persistor config?
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    workshop: persistReducer(persistSettingsConfig, workshopSlice.reducer),
    installedPage: installedPageSlice.reducer,
    [appApi.reducerPath]: appApi.reducer,
  },
  middleware: (getDefaultMiddleware) => [
    ...getDefaultMiddleware({
      // See https://github.com/rt2zz/redux-persist/issues/988#issuecomment-654875104
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/FLUSH"],
      },
    }),
    appApi.middleware,
    routerMiddleware(hashHistory),
    ...conditionalMiddleware,
  ],
  devTools: REDUX_DEV_TOOLS,
});

export const persistor = persistStore(store);

// https://redux-toolkit.js.org/rtk-query/overview#configure-the-store
// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors see `setupListeners` docs - takes an optional
// callback as the 2nd arg for customization
setupListeners(store.dispatch);

export default store;
