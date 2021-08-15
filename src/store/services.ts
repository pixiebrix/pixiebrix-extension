import { localStorage } from "redux-persist-webextension-storage";

export const persistServicesConfig = {
  key: "servicesOptions",
  storage: localStorage,
};
