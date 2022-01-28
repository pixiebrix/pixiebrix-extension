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
import { persistStore, persistReducer } from "redux-persist";
import { localStorage } from "redux-persist-webextension-storage";
import { editorSlice, EditorState } from "@/devTools/editor/slices/editorSlice";
import { createLogger } from "redux-logger";
import { boolean } from "@/utils";
import { setupListeners } from "@reduxjs/toolkit/query/react";
import { appApi } from "@/services/api";
import {
  formBuilderSlice,
  FormBuilderState,
} from "@/devTools/editor/slices/formBuilderSlice";
import runtimeSlice, {
  RuntimeState,
} from "@/devTools/editor/slices/runtimeSlice";
import {
  savingExtensionSlice,
  SavingExtensionState,
} from "@/devTools/editor/panes/save/savingExtensionSlice";
import {
  documentBuilderSlice,
  DocumentBuilderState,
} from "./editor/slices/documentBuilderSlice";
import { OptionsState } from "@/store/extensionsTypes";
import settingsSlice from "@/store/settingsSlice";
import { persistExtensionOptionsConfig } from "@/store/extensionsStorage";
import servicesSlice, { persistServicesConfig } from "@/store/servicesSlice";
import extensionsSlice from "@/store/extensionsSlice";
import { SettingsState } from "@/store/settingsTypes";

const REDUX_DEV_TOOLS: boolean = boolean(process.env.REDUX_DEV_TOOLS);

const persistSettingsConfig = {
  key: "settings",
  storage: localStorage,
};

export type RootState = {
  options: OptionsState;
  editor: EditorState;
  savingExtension: SavingExtensionState;
  formBuilder: FormBuilderState;
  documentBuilder: DocumentBuilderState;
  settings: SettingsState;
  runtime: RuntimeState;
};

const conditionalMiddleware: Middleware[] = [];
if (process.env.NODE_ENV === "development") {
  // Allow tree shaking of logger in production
  // https://github.com/LogRocket/redux-logger/issues/6
  conditionalMiddleware.push(createLogger());
}

const store = configureStore({
  reducer: {
    options: persistReducer(
      persistExtensionOptionsConfig,
      extensionsSlice.reducer
    ),
    services: persistReducer(persistServicesConfig, servicesSlice.reducer),
    settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    editor: editorSlice.reducer,
    savingExtension: savingExtensionSlice.reducer,
    runtime: runtimeSlice.reducer,
    formBuilder: formBuilderSlice.reducer,
    documentBuilder: documentBuilderSlice.reducer,
    [appApi.reducerPath]: appApi.reducer,
  },
  middleware: (getDefaultMiddleware) => [
    ...getDefaultMiddleware({
      // See https://github.com/rt2zz/redux-persist/issues/988#issuecomment-654875104
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
    appApi.middleware,
    ...conditionalMiddleware,
  ],
  devTools: REDUX_DEV_TOOLS,
});

export const persistor = persistStore(store);

// https://redux-toolkit.js.org/rtk-query/overview#configure-the-store
// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors see `setupListeners` docs - takes an optional
// callback as the 2nd arg for customization
setupListeners(store.dispatch);

export default store;
