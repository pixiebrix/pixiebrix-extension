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

import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import { persistSettingsConfig } from "../store/settings/settingsStorage";
import settingsSlice from "../store/settings/settingsSlice";
import { appApi } from "@/data/service/api";
import { modDefinitionsMiddleware } from "../modDefinitions/modDefinitionsListenerMiddleware";
import {
  createRenderHookWithWrappers,
  createRenderWithWrappers,
} from "./testHelpers";
import integrationsSlice, {
  type IntegrationsState,
} from "../integrations/store/integrationsSlice";

function configureCommonStoreForTests(initialState?: {
  auth?: unknown;
  settings?: unknown;
  integrations?: IntegrationsState;
}) {
  return configureStore({
    reducer: {
      auth: persistReducer(persistAuthConfig, authSlice.reducer),
      settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
      integrations: integrationsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware()
        .concat(appApi.middleware)
        .concat(modDefinitionsMiddleware);
    },
    preloadedState: initialState,
  });
}

const renderWithWrappers = createRenderWithWrappers(
  configureCommonStoreForTests,
);
const renderHookWithWrappers = createRenderHookWithWrappers(
  configureCommonStoreForTests,
);

// eslint-disable-next-line import/export -- re-export RTL
export * from "@testing-library/react";

/** @knip Keep for consistency of API with other render helper modules */
// eslint-disable-next-line import/export -- override render
export { renderWithWrappers as render };
export { renderHookWithWrappers as renderHook };
