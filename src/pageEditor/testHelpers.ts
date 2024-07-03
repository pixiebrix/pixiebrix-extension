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
import modComponentsSlice from "@/store/extensionsSlice";
import integrationsSlice from "@/integrations/store/integrationsSlice";
import settingsSlice from "@/store/settings/settingsSlice";
import { editorSlice } from "@/pageEditor/store/editor/editorSlice";
import sessionSlice from "@/pageEditor/store/session/sessionSlice";
import { savingModComponentSlice } from "@/pageEditor/store/savingModComponentSlice";
import runtimeSlice from "@/pageEditor/store/runtime/runtimeSlice";
import { logSlice } from "@/components/logViewer/logSlice";
import {
  createRenderHookWithWrappers,
  createRenderWithWrappers,
} from "@/testUtils/testHelpers";
import analysisSlice from "@/analysis/analysisSlice";
import pageEditorAnalysisManager from "./store/analysisManager";
import { tabStateSlice } from "@/pageEditor/store/tabState/tabStateSlice";
import { appApi } from "@/data/service/api";
import { modDefinitionsSlice } from "@/modDefinitions/modDefinitionsSlice";
import { modDefinitionsMiddleware } from "@/modDefinitions/modDefinitionsListenerMiddleware";

const configureStoreForTests = () =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
      options: modComponentsSlice.reducer,
      integrations: integrationsSlice.reducer,
      settings: settingsSlice.reducer,
      editor: editorSlice.reducer,
      session: sessionSlice.reducer,
      savingModComponent: savingModComponentSlice.reducer,
      runtime: runtimeSlice.reducer,
      logs: logSlice.reducer,
      analysis: analysisSlice.reducer,
      tabState: tabStateSlice.reducer,
      modDefinitions: modDefinitionsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware()
        .concat(appApi.middleware)
        .concat(pageEditorAnalysisManager.middleware)
        .concat(modDefinitionsMiddleware);
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
export { act as hookAct } from "@testing-library/react-hooks";
export { userEvent } from "@testing-library/user-event";
