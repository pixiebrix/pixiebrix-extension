import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
// @ts-ignore: no typings defined
import { localStorage } from "redux-persist-webextension-storage";
import { createLogger } from "redux-logger";

import { optionsSlice, servicesSlice } from "@/designer/options/slices";

const persistOptionsConfig = {
  key: "extensionOptions",
  storage: localStorage,
};

const persistServicesConfig = {
  key: "servicesOptions",
  storage: localStorage,
};

const store = configureStore({
  reducer: {
    options: persistReducer(persistOptionsConfig, optionsSlice.reducer),
    services: persistReducer(persistServicesConfig, servicesSlice.reducer),
  },
  middleware: [createLogger()],
});

export const persistor = persistStore(store);

export default store;
