/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { v4 as uuidv4 } from "uuid";
import { createSlice } from "@reduxjs/toolkit";
import { Metadata, RawServiceConfiguration, ServiceDependency } from "@/core";
import { Permissions } from "webextension-polyfill-ts";

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
  _recipe: Metadata | null;
  extensionPointId: string;
  active: boolean;
  label: string;
  permissions?: Permissions.Permissions;
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
          _recipe: recipe.metadata,
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
        _recipe: null,
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
