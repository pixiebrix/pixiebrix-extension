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

import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "@/auth/authSlice";
import extensionsSlice from "@/store/extensionsSlice";
import servicesSlice from "@/store/servicesSlice";
import settingsSlice from "@/store/settingsSlice";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import sessionSlice from "@/pageEditor/slices/sessionSlice";
import { savingExtensionSlice } from "@/pageEditor/panes/save/savingExtensionSlice";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import { logSlice } from "@/components/logViewer/logSlice";
import { createRenderWithWrappers } from "@/testUtils/testHelpers";

const renderWithWrappers = createRenderWithWrappers(() =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
      options: extensionsSlice.reducer,
      services: servicesSlice.reducer,
      settings: settingsSlice.reducer,
      editor: editorSlice.reducer,
      session: sessionSlice.reducer,
      savingExtension: savingExtensionSlice.reducer,
      runtime: runtimeSlice.reducer,
      logs: logSlice.reducer,
    },
  })
);

// eslint-disable-next-line import/export -- re-export RTL
export * from "@testing-library/react";
// eslint-disable-next-line import/export -- override render
export { renderWithWrappers as render };
