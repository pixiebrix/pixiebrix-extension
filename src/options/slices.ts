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
import { reportEvent } from "@/telemetry/events";
import { preloadMenus } from "@/background/preload";
import { reportError } from "@/telemetry/logging";
import { Primitive } from "type-fest";

type InstallMode = "local" | "remote";

export interface SettingsState {
  mode: InstallMode;
}

const initialSettingsState = {
  mode: "remote",
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState: initialSettingsState,
  reducers: {
    setMode(state, { payload: { mode } }) {
      state.mode = mode;
    },
  },
});

export interface ServicesState {
  configured: { [id: string]: RawServiceConfiguration };
}

const initialServicesState: ServicesState = {
  configured: {},
};

type BaseConfig = Record<string, unknown>;
type UserOptions = Record<string, Primitive>;

type DeploymentMeta = {
  id: string;
  timestamp: string;
};

export interface ExtensionOptions<TConfig = BaseConfig> {
  id: string;
  _deployment?: DeploymentMeta;
  _recipeId?: string;
  _recipe: Metadata | null;
  extensionPointId: string;
  active: boolean;
  label: string;
  optionsArgs?: UserOptions;
  permissions?: Permissions.Permissions;
  services: ServiceDependency[];
  config: TConfig;
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

/* The object access in servicesSlice and optionsSlice should be safe because slice reducers use immer under the hood */
/* eslint-disable security/detect-object-injection */

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
      const {
        recipe,
        services: auths,
        optionsArgs,
        extensionPoints,
        deployment,
      } = payload;
      for (const {
        id: extensionPointId,
        label,
        services,
        config,
      } of extensionPoints) {
        const extensionId = uuidv4();
        if (extensionPointId == null) {
          throw new Error("extensionPointId is required");
        }
        if (state.extensions[extensionPointId] == null) {
          state.extensions[extensionPointId] = {};
        }
        reportEvent("ExtensionActivate", {
          extensionId,
          blueprintId: recipe.metadata.id,
        });

        const extensionConfig: ExtensionOptions = {
          id: extensionId,
          _deployment: deployment
            ? {
                id: deployment.id,
                timestamp: deployment.updated_at,
              }
            : undefined,
          _recipeId: recipe.metadata.id,
          _recipe: recipe.metadata,
          optionsArgs,
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

        state.extensions[extensionPointId][extensionId] = extensionConfig;

        preloadMenus({ extensions: [extensionConfig] }).catch((err) => {
          reportError(err);
        });
      }
    },
    saveExtension(state, { payload }) {
      const {
        id,
        extensionId,
        extensionPointId,
        config,
        label,
        optionsArgs,
        services,
      } = payload;
      // support both extensionId and id to keep the API consistent with the shape of the stored extension
      if (extensionId == null && id == null) {
        throw new Error("extensionId is required");
      } else if (extensionPointId == null) {
        throw new Error("extensionPointId is required");
      }
      if (state.extensions[extensionPointId] == null) {
        state.extensions[extensionPointId] = {};
      }
      state.extensions[extensionPointId][extensionId ?? id] = {
        id: extensionId ?? id,
        extensionPointId,
        _recipe: null,
        label,
        optionsArgs,
        services,
        active: true,
        config,
      };
    },
    removeExtension(state, { payload }) {
      const { extensionPointId, extensionId } = payload;
      const extensions = state.extensions[extensionPointId] ?? {};
      if (!extensions[extensionId]) {
        // it's already removed
        console.debug(
          `Extension id ${extensionId} does not exist for extension point ${extensionPointId}`
        );
      } else {
        delete extensions[extensionId];
      }
    },
  },
});

/* eslint-enable */
