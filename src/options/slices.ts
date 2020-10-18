import { v4 as uuidv4 } from "uuid";
import { createSlice } from "@reduxjs/toolkit";
import { RawServiceConfiguration, ServiceDependency } from "@/core";

export interface ServicesState {
  configured: { [id: string]: RawServiceConfiguration };
}

const initialServicesState: ServicesState = {
  configured: {},
};

export const servicesSlice = createSlice({
  name: "services",
  initialState: initialServicesState,
  reducers: {
    deleteServiceConfig(state, { payload: { id } }) {
      if (!state.configured[id]) {
        throw new Error(`Service configuration ${id} does not exist`);
      }
      delete state.configured[id];
      return state;
    },
    updateServiceConfig(state, { payload: { id, serviceId, label, config } }) {
      state.configured[id] = {
        _rawServiceConfigurationBrand: undefined,
        id,
        serviceId,
        label,
        config,
      };
    },
    resetServices(state) {
      state.configured = {};
    },
  },
});

export interface ExtensionOptions {
  id: string;
  _recipeId?: string;
  extensionPointId: string;
  active: boolean;
  label: string;
  services: ServiceDependency[];
  config: { [prop: string]: unknown };
}

export interface OptionsState {
  extensions: {
    [extensionPointId: string]: {
      [extensionId: string]: ExtensionOptions;
    };
  };
}

const initialOptionsState: OptionsState = {
  extensions: {},
};

export const optionsSlice = createSlice({
  name: "options",
  initialState: initialOptionsState,
  reducers: {
    resetOptions(state) {
      state.extensions = {};
    },
    toggleExtension(state, { payload }) {
      const { extensionPointId, extensionId, active } = payload;
      state.extensions[extensionPointId][extensionId].active = active;
    },
    installRecipe(state, { payload }) {
      const { recipe, services: auths, extensionPoints } = payload;
      for (const {
        id: extensionPointId,
        label,
        services,
        config,
      } of extensionPoints) {
        const extensionId = uuidv4();
        if (state.extensions[extensionPointId] == null) {
          state.extensions[extensionPointId] = {};
        }
        state.extensions[extensionPointId][extensionId] = {
          id: extensionId,
          _recipeId: recipe.metadata.id,
          services: Object.entries(services ?? {}).map(
            ([outputKey, id]: [string, string]) => ({
              outputKey,
              config: auths[id],
              id,
            })
          ),
          label,
          extensionPointId,
          active: true,
          config,
        };
      }
    },
    saveExtension(state, { payload }) {
      const {
        extensionPointId,
        extensionId,
        config,
        label,
        services,
      } = payload;
      if (state.extensions[extensionPointId] == null) {
        state.extensions[extensionPointId] = {};
      }
      state.extensions[extensionPointId][extensionId] = {
        id: extensionId,
        label,
        services,
        extensionPointId,
        active: true,
        config,
      };
    },
    removeExtension(state, { payload }) {
      const { extensionPointId, extensionId } = payload;
      const extensions = state.extensions[extensionPointId];
      delete extensions[extensionId];
    },
  },
});
