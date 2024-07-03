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

import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import {
  editorSlice,
  persistEditorConfig,
} from "@/pageEditor/store/editor/editorSlice";
import { createLogger } from "redux-logger";
import { setupListeners } from "@reduxjs/toolkit/query/react";
import { appApi } from "@/data/service/api";
import runtimeSlice from "@/pageEditor/store/runtime/runtimeSlice";
import { savingModComponentSlice } from "@/pageEditor/panes/save/savingModComponentSlice";
import settingsSlice from "@/store/settings/settingsSlice";
import { persistModComponentOptionsConfig } from "@/store/extensionsStorage";
import integrationsSlice, {
  persistIntegrationsConfig,
} from "@/integrations/store/integrationsSlice";
import modComponentsSlice from "@/store/extensionsSlice";
import sessionSlice from "@/pageEditor/store/session/sessionSlice";
import { logSlice } from "@/components/logViewer/logSlice";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import analysisSlice from "@/analysis/analysisSlice";
import pageEditorAnalysisManager from "../analysisManager";
import { tabStateSlice } from "@/pageEditor/store/tabState/tabStateSlice";
import { modDefinitionsSlice } from "@/modDefinitions/modDefinitionsSlice";
import { modDefinitionsMiddleware } from "@/modDefinitions/modDefinitionsListenerMiddleware";
import {
  persistSessionChangesConfig,
  sessionChangesSlice,
  sessionChangesStateSyncActions,
} from "@/store/sessionChanges/sessionChangesSlice";
import { sessionChangesMiddleware } from "@/store/sessionChanges/sessionChangesListenerMiddleware";
import { createStateSyncMiddleware } from "redux-state-sync";
import { boolean } from "@/utils/typeUtils";
import { persistSettingsConfig } from "@/store/settings/settingsStorage";
import { defaultCreateStateSyncMiddlewareConfig } from "@/store/defaultMiddlewareConfig";

const REDUX_DEV_TOOLS: boolean = boolean(process.env.REDUX_DEV_TOOLS);

const conditionalMiddleware: Middleware[] = [];
if (typeof createLogger === "function") {
  // Allow tree shaking of logger in production
  // https://github.com/LogRocket/redux-logger/issues/6
  conditionalMiddleware.push(
    createLogger({
      // Do not log polling actions (they happen too often)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- TODO
      predicate: (getState, action) => !action.type.includes("logs/polling"),
    }),
  );
}

const store = configureStore({
  reducer: {
    auth: persistReducer(persistAuthConfig, authSlice.reducer),
    options: persistReducer(
      persistModComponentOptionsConfig,
      modComponentsSlice.reducer,
    ),
    integrations: persistReducer(
      persistIntegrationsConfig,
      integrationsSlice.reducer,
    ),
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    editor: persistReducer(persistEditorConfig, editorSlice.reducer),
    session: sessionSlice.reducer,
    sessionChanges: persistReducer(
      persistSessionChangesConfig,
      sessionChangesSlice.reducer,
    ),
    savingModComponent: savingModComponentSlice.reducer,
    runtime: runtimeSlice.reducer,
    logs: logSlice.reducer,
    analysis: analysisSlice.reducer,
    tabState: tabStateSlice.reducer,
    modDefinitions: modDefinitionsSlice.reducer,
    [appApi.reducerPath]: appApi.reducer,
  },
  middleware(getDefaultMiddleware) {
    /* eslint-disable unicorn/prefer-spread -- It's not Array#concat, can't use spread */
    return getDefaultMiddleware({
      // This check significantly slows down the app in dev mode.
      // See PR for more details https://github.com/pixiebrix/pixiebrix-extension/pull/4951
      serializableCheck: false,
      // RTK uses Immer internally, we don't need this extra check
      immutableCheck: false,
    })
      .concat(appApi.middleware)
      .concat(pageEditorAnalysisManager.middleware)
      .concat(modDefinitionsMiddleware)
      .concat(conditionalMiddleware)
      .concat(sessionChangesMiddleware)
      .concat(
        createStateSyncMiddleware({
          ...defaultCreateStateSyncMiddlewareConfig,
          // In the future: concat whitelisted sync action lists here
          whitelist: sessionChangesStateSyncActions,
        }),
      );
    /* eslint-enable unicorn/prefer-spread  */
  },
  devTools: REDUX_DEV_TOOLS,
});

export const persistor = persistStore(store);

// https://redux-toolkit.js.org/rtk-query/overview#configure-the-store
// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors see `setupListeners` docs - takes an optional
// callback as the 2nd arg for customization
setupListeners(store.dispatch);

export default store;
