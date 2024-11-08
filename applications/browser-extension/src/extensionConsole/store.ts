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
  type AnyAction,
  configureStore,
  type ThunkDispatch,
  type Middleware,
} from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import { createLogger } from "redux-logger";
import { connectRouter, routerMiddleware } from "connected-react-router";
import { createHashHistory } from "history";
import { type ModComponentsRootState } from "../store/modComponents/modComponentTypes";
import integrationsSlice, {
  persistIntegrationsConfig,
  type ServicesRootState,
} from "../integrations/store/integrationsSlice";
import {
  type ModModalsRootState,
  modModalsSlice,
} from "./pages/mods/modals/modModalsSlice";
import { appApi } from "@/data/service/api";
import { setupListeners } from "@reduxjs/toolkit/query/react";
import modComponentSlice from "../store/modComponents/modComponentSlice";
import settingsSlice from "../store/settings/settingsSlice";
import workshopSlice, {
  persistWorkshopConfig,
  type WorkshopRootState,
} from "../store/workshopSlice";
import { persistModComponentOptionsConfig } from "../store/modComponents/modComponentStorage";
import { persistSettingsConfig } from "../store/settings/settingsStorage";
import { type SettingsRootState } from "../store/settings/settingsTypes";
import modsPageSlice, { persistModsConfig } from "./pages/mods/modsPageSlice";
import { logSlice } from "@/components/logViewer/logSlice";
import { type LogRootState } from "@/components/logViewer/logViewerTypes";
import { type AuthRootState } from "@/auth/authTypes";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import { type ModsPageRootState } from "./pages/mods/modsPageSelectors";
import { modDefinitionsSlice } from "../modDefinitions/modDefinitionsSlice";
import { modDefinitionsMiddleware } from "../modDefinitions/modDefinitionsListenerMiddleware";
import sessionSlice from "../pageEditor/store/session/sessionSlice";
import {
  persistSessionChangesConfig,
  sessionChangesSlice,
  sessionChangesStateSyncActions,
} from "../store/sessionChanges/sessionChangesSlice";
import { sessionChangesMiddleware } from "../store/sessionChanges/sessionChangesListenerMiddleware";
import { createStateSyncMiddleware } from "redux-state-sync";
import { type SessionRootState } from "../pageEditor/store/session/sessionSliceTypes";
import { type SessionChangesRootState } from "../store/sessionChanges/sessionChangesTypes";
import { boolean } from "../utils/typeUtils";
import defaultMiddlewareConfig, {
  defaultCreateStateSyncMiddlewareConfig,
} from "../store/defaultMiddlewareConfig";

const REDUX_DEV_TOOLS: boolean = boolean(process.env.REDUX_DEV_TOOLS);

export const hashHistory = createHashHistory({ hashType: "slash" });

export type RootState = AuthRootState &
  LogRootState &
  ModsPageRootState &
  ModComponentsRootState &
  ServicesRootState &
  SettingsRootState &
  WorkshopRootState &
  ModModalsRootState &
  SessionRootState &
  SessionChangesRootState;

const conditionalMiddleware: Middleware[] = [];
if (typeof createLogger === "function") {
  // Allow tree shaking of logger in production
  // https://github.com/LogRocket/redux-logger/issues/6
  conditionalMiddleware.push(
    createLogger({
      // Do not log polling actions (they happen too often)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- TODO
      predicate: (getState, action) => !action.type.includes("logs/polling"),
    }),
  );
}

const store = configureStore({
  reducer: {
    router: connectRouter(hashHistory),
    auth: persistReducer(persistAuthConfig, authSlice.reducer),
    options: persistReducer(
      persistModComponentOptionsConfig,
      modComponentSlice.reducer,
    ),
    modsPage: persistReducer(persistModsConfig, modsPageSlice.reducer),
    integrations: persistReducer(
      persistIntegrationsConfig,
      integrationsSlice.reducer,
    ),
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    workshop: persistReducer(persistWorkshopConfig, workshopSlice.reducer),
    modModals: modModalsSlice.reducer,
    logs: logSlice.reducer,
    modDefinitions: modDefinitionsSlice.reducer,
    session: sessionSlice.reducer,
    sessionChanges: persistReducer(
      persistSessionChangesConfig,
      sessionChangesSlice.reducer,
    ),
    [appApi.reducerPath]: appApi.reducer,
  },
  middleware(getDefaultMiddleware) {
    /* eslint-disable unicorn/prefer-spread -- It's not Array#concat, can't use spread */
    return getDefaultMiddleware({
      ...defaultMiddlewareConfig,
      serializableCheck: false,
    })
      .concat(appApi.middleware)
      .concat(modDefinitionsMiddleware)
      .concat(routerMiddleware(hashHistory))
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

export type AppDispatch = ThunkDispatch<RootState, unknown, AnyAction>;

export default store;
