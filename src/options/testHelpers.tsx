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
import settingsSlice from "@/store/settingsSlice";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import { createRenderWithWrappers } from "@/testUtils/testHelpers";

const renderWithWrappers = createRenderWithWrappers(() =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
      settings: settingsSlice.reducer,
      options: extensionsSlice.reducer,
      blueprintModals: blueprintModalsSlice.reducer,
      // This api reducer may be needed at some point, but it's not mocked properly yet, so
      //  we're not including it for now, until it becomes an issue.
      // [appApi.reducerPath]: appApi.reducer,
    },
  })
);

// eslint-disable-next-line import/export -- re-export RTL
export * from "@testing-library/react";
// eslint-disable-next-line import/export -- override render
export { renderWithWrappers as render };
