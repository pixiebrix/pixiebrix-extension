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

import {
  configureStore,
  type ThunkDispatch,
  type Middleware,
  type AnyAction,
} from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import { createLogger } from "redux-logger";
import { setupListeners } from "@reduxjs/toolkit/query/react";
import modComponentSlice from "../store/modComponents/modComponentSlice";
import { persistModComponentOptionsConfig } from "../store/modComponents/modComponentStorage";
import sidebarSlice from "../store/sidebar/sidebarSlice";
import { persistSettingsConfig } from "../store/settings/settingsStorage";
import settingsSlice from "../store/settings/settingsSlice";
import { appApi } from "../data/service/api";
import { authSlice, persistAuthConfig } from "../auth/authSlice";
import integrationsSlice, {
  type IntegrationsState,
  persistIntegrationsConfig,
} from "../integrations/store/integrationsSlice";
import { modDefinitionsSlice } from "../modDefinitions/modDefinitionsSlice";
import { boolean } from "../utils/typeUtils";
import defaultMiddlewareConfig, {
  defaultCreateStateSyncMiddlewareConfig,
} from "../store/defaultMiddlewareConfig";
import { sessionChangesMiddleware } from "../store/sessionChanges/sessionChangesListenerMiddleware";
import { createStateSyncMiddleware } from "redux-state-sync";
import {
  persistSessionChangesConfig,
  sessionChangesSlice,
  sessionChangesStateSyncActions,
} from "../store/sessionChanges/sessionChangesSlice";
import sessionSlice from "../pageEditor/store/session/sessionSlice";
import { type AuthState } from "../auth/authTypes";
import { type ModDefinitionsState } from "../modDefinitions/modDefinitionsTypes";
import { type SessionState } from "../pageEditor/store/session/sessionSliceTypes";
import { type SessionChangesState } from "../store/sessionChanges/sessionChangesTypes";
import { type SettingsState } from "../store/settings/settingsTypes";
import { type SidebarState } from "@/types/sidebarTypes";
import { persistSidebarConfig } from "../store/sidebar/sidebarStorage";

const REDUX_DEV_TOOLS: boolean = boolean(process.env.REDUX_DEV_TOOLS);

const conditionalMiddleware: Middleware[] = [];
if (typeof createLogger === "function") {
  // Allow tree shaking of logger in production
  // https://github.com/LogRocket/redux-logger/issues/6
  conditionalMiddleware.push(createLogger());
}

const store = configureStore({
  reducer: {
    auth: persistReducer(persistAuthConfig, authSlice.reducer),
    options: persistReducer(
      persistModComponentOptionsConfig,
      modComponentSlice.reducer,
    ),
    sidebar: persistReducer(persistSidebarConfig, sidebarSlice.reducer),
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    // `integrations` slice is used to determine login state for partner installs
    integrations: persistReducer(
      persistIntegrationsConfig,
      integrationsSlice.reducer,
    ),
    session: sessionSlice.reducer,
    sessionChanges: persistReducer(
      persistSessionChangesConfig,
      sessionChangesSlice.reducer,
    ),
    modDefinitions: modDefinitionsSlice.reducer,
    [appApi.reducerPath]: appApi.reducer,
  },
  middleware(getDefaultMiddleware) {
    /* eslint-disable unicorn/prefer-spread -- It's not Array#concat, can't use spread */
    return getDefaultMiddleware(defaultMiddlewareConfig)
      .concat(appApi.middleware)
      .concat(conditionalMiddleware)
      .concat(sessionChangesMiddleware)
      .concat(
        createStateSyncMiddleware({
          ...defaultCreateStateSyncMiddlewareConfig,
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

type RootState = {
  auth: AuthState;
  options: ReturnType<typeof modComponentSlice.reducer>;
  sidebar: SidebarState;
  settings: SettingsState;
  integrations: IntegrationsState;
  session: SessionState;
  sessionChanges: SessionChangesState;
  modDefinitions: ModDefinitionsState;
  [appApi.reducerPath]: ReturnType<typeof appApi.reducer>;
};

export type AppDispatch = ThunkDispatch<RootState, undefined, AnyAction>;

export default store;
