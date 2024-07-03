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
import { authSlice } from "@/auth/authSlice";
import extensionsSlice from "@/store/extensionsSlice";
import integrationsSlice from "@/integrations/store/integrationsSlice";
import settingsSlice from "@/store/settings/settingsSlice";
import sidebarSlice from "@/store/sidebar/sidebarSlice";
import {
  createRenderHookWithWrappers,
  createRenderWithWrappers,
} from "@/testUtils/testHelpers";
import { appApi } from "@/data/service/api";
import { modDefinitionsMiddleware } from "@/modDefinitions/modDefinitionsListenerMiddleware";
import { modDefinitionsSlice } from "@/modDefinitions/modDefinitionsSlice";
import { sessionChangesMiddleware } from "@/store/sessionChanges/sessionChangesListenerMiddleware";
import sessionSlice from "@/pageEditor/store/session/sessionSlice";

const configureStoreForTests = () =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
      modDefinitions: modDefinitionsSlice.reducer,
      options: extensionsSlice.reducer,
      sidebar: sidebarSlice.reducer,
      session: sessionSlice.reducer,
      settings: settingsSlice.reducer,
      integrations: integrationsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware()
        .concat(appApi.middleware)
        .concat(modDefinitionsMiddleware)
        .concat(sessionChangesMiddleware);
    },
  });

const renderWithWrappers = createRenderWithWrappers(configureStoreForTests);
const renderHookWithWrappers = createRenderHookWithWrappers(
  configureStoreForTests,
);

// eslint-disable-next-line import/export -- re-export RTL
export * from "@testing-library/react";
// eslint-disable-next-line import/export -- override render
export { renderWithWrappers as render };
export { renderHookWithWrappers as renderHook };
