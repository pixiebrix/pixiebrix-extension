import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
// @ts-ignore: redux-persist-webextension-storage has no type definitions
import { localStorage } from "redux-persist-webextension-storage";
import {
  optionsSlice,
  OptionsState,
  servicesSlice,
  ServicesState,
} from "./slices";
import { createLogger } from "redux-logger";
import { connectRouter, routerMiddleware } from "connected-react-router";
import { createHashHistory } from "history";

const persistOptionsConfig = {
  key: "extensionOptions",
  storage: localStorage,
};

export const hashHistory = createHashHistory({ hashType: "slash" });

const persistServicesConfig = {
  key: "servicesOptions",
  storage: localStorage,
};

export interface RootState {
  options: OptionsState;
  services: ServicesState;
}

const store = configureStore({
  reducer: {
    router: connectRouter(hashHistory),
    options: persistReducer(persistOptionsConfig, optionsSlice.reducer),
    services: persistReducer(persistServicesConfig, servicesSlice.reducer),
  },
  middleware: [routerMiddleware(hashHistory), createLogger()],
  devTools: true,
});

export const persistor = persistStore(store);

export default store;
