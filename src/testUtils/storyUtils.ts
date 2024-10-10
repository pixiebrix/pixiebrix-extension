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
import settingsSlice from "@/store/settings/settingsSlice";
import { appApi } from "@/data/service/api";
import { editorSlice } from "@/pageEditor/store/editor/editorSlice";
import sessionSlice from "@/pageEditor/store/session/sessionSlice";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { modDefinitionsSlice } from "@/modDefinitions/modDefinitionsSlice";

export function settingsStore() {
  return configureStore({
    reducer: {
      settings: settingsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware().concat(appApi.middleware);
    },
    preloadedState: {},
  });
}

export function editorStore() {
  return configureStore({
    reducer: {
      editor: editorSlice.reducer,
      session: sessionSlice.reducer,
      settings: settingsSlice.reducer,
      options: modComponentSlice.reducer,
      modDefinitions: modDefinitionsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware().concat(appApi.middleware);
    },
    preloadedState: {},
  });
}
