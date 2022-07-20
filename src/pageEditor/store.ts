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
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { createLogger } from "redux-logger";
import { boolean } from "@/utils";
import { setupListeners } from "@reduxjs/toolkit/query/react";
import { appApi } from "@/services/api";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import { savingExtensionSlice } from "@/pageEditor/panes/save/savingExtensionSlice";
import settingsSlice from "@/store/settingsSlice";
import { persistExtensionOptionsConfig } from "@/store/extensionsStorage";
import servicesSlice, { persistServicesConfig } from "@/store/servicesSlice";
import extensionsSlice from "@/store/extensionsSlice";
import sessionSlice from "@/pageEditor/slices/sessionSlice";
import { logActions, logSlice } from "@/components/logViewer/logSlice";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import validationListenerMiddleware from "./validation/validationListenerMiddleware";
import analysisSlice from "@/analysis/analysisSlice";
import EditorManager from "@/analysis/editorManager";

const REDUX_DEV_TOOLS: boolean = boolean(process.env.REDUX_DEV_TOOLS);

const persistSettingsConfig = {
  key: "settings",
  storage: localStorage,
};

const conditionalMiddleware: Middleware[] = [];
if (typeof createLogger === "function") {
  // Allow tree shaking of logger in production
  // https://github.com/LogRocket/redux-logger/issues/6
  conditionalMiddleware.push(
    createLogger({
      // Do not log polling actions (they happen too often)
      predicate: (getState, action) => !action.type.includes("logs/polling"),
    })
  );
}

const editorAnalysisManager = new EditorManager();

const store = configureStore({
  reducer: {
    auth: persistReducer(persistAuthConfig, authSlice.reducer),
    options: persistReducer(
      persistExtensionOptionsConfig,
      extensionsSlice.reducer
    ),
    services: persistReducer(persistServicesConfig, servicesSlice.reducer),
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    editor: editorSlice.reducer,
    session: sessionSlice.reducer,
    savingExtension: savingExtensionSlice.reducer,
    runtime: runtimeSlice.reducer,
    logs: logSlice.reducer,
    analysis: analysisSlice.reducer,
    [appApi.reducerPath]: appApi.reducer,
  },
  middleware(getDefaultMiddleware) {
    /* eslint-disable unicorn/prefer-spread -- use .concat for proper type inference */
    return getDefaultMiddleware({
      // See https://github.com/rt2zz/redux-persist/issues/988#issuecomment-654875104
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    })
      .concat(appApi.middleware)
      .concat(validationListenerMiddleware)
      .concat(editorAnalysisManager.middleware)
      .concat(conditionalMiddleware);
    /* eslint-enable unicorn/prefer-spread */
  },
  devTools: REDUX_DEV_TOOLS,
});

export const persistor = persistStore(store);

// https://redux-toolkit.js.org/rtk-query/overview#configure-the-store
// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors see `setupListeners` docs - takes an optional
// callback as the 2nd arg for customization
setupListeners(store.dispatch);

void store.dispatch(logActions.pollLogs());

export default store;
