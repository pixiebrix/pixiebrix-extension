/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  DeploymentContext,
  IExtension,
  OutputKey,
  PersistedExtension,
  RawServiceConfiguration,
  RecipeMetadata,
  RegistryId,
  UserOptions,
  UUID,
} from "@/core";
import { orderBy, pick } from "lodash";
import { reportEvent } from "@/telemetry/events";
import { contextMenus, traces } from "@/background/messenger/api";
import { selectEventData } from "@/telemetry/deployments";
import { uuidv4 } from "@/types/helpers";
import { ExtensionOptionsState, requireLatestState } from "@/store/extensions";
import { ExtensionPointConfig, RecipeDefinition } from "@/types/definitions";
import { CloudExtension, Deployment } from "@/types/contract";
import { saveUserExtension } from "@/services/apiClient";
import { reportError } from "@/telemetry/logging";

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
  configured: Record<string, RawServiceConfiguration>;
}

const initialServicesState: ServicesState = {
  configured: {},
};

type RecentBrick = {
  id: string;
  timestamp: number;
};

export type WorkshopState = {
  recent: RecentBrick[];
  maxRecent: number;

  filters: {
    scopes: string[];
    collections: string[];
    kinds: string[];
  };
};

const initialWorkshopState: WorkshopState = {
  recent: [],
  // Only track the 10 most recent bricks accessed, since that's how many are shown on the workspace page
  maxRecent: 10,

  filters: {
    scopes: [],
    collections: [],
    kinds: [],
  },
};

const initialOptionsState: ExtensionOptionsState = {
  extensions: [],
};

export const workshopSlice = createSlice({
  name: "workshop",
  initialState: initialWorkshopState,
  reducers: {
    setScopes(state, { payload: scopes }) {
      state.filters.scopes = scopes;
    },
    setCollections(state, { payload: collections }) {
      state.filters.collections = collections;
    },
    setKinds(state, { payload: kinds }) {
      state.filters.kinds = kinds;
    },
    clearFilters(state) {
      state.filters = {
        scopes: [],
        collections: [],
        kinds: [],
      };
    },
    touchBrick(state, { payload: { id } }) {
      if (id) {
        state.recent = state.recent.filter((x) => x.id !== id);
        state.recent.push({
          id,
          timestamp: Date.now(),
        });
        state.recent = orderBy(
          state.recent,
          [(x) => x.timestamp],
          ["desc"]
        ).slice(0, state.maxRecent);
      }
    },
  },
});

export const servicesSlice = createSlice({
  /* The object access in servicesSlice and optionsSlice should be safe because type-checker enforced UUID */
  /* eslint-disable security/detect-object-injection */

  name: "services",
  initialState: initialServicesState,
  reducers: {
    deleteServiceConfig(
      state,
      { payload: { id } }: PayloadAction<{ id: UUID }>
    ) {
      if (!state.configured[id]) {
        throw new Error(`Service configuration ${id} does not exist`);
      }

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- type-checked as UUID
      delete state.configured[id];
      return state;
    },
    updateServiceConfig(state, { payload: { id, serviceId, label, config } }) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- branding with nominal type
      state.configured[id] = {
        id,
        serviceId,
        label,
        config,
      } as RawServiceConfiguration;
    },
    resetServices(state) {
      state.configured = {};
    },
  },

  /* eslint-enable security/detect-object-injection */
});

function selectDeploymentContext(
  deployment: Deployment
): DeploymentContext | undefined {
  if (deployment) {
    return {
      id: deployment.id,
      timestamp: deployment.updated_at,
      active: deployment.active,
    };
  }
}

export const optionsSlice = createSlice({
  name: "options",
  initialState: initialOptionsState,
  reducers: {
    resetOptions(state) {
      state.extensions = [];
    },

    installCloudExtension(
      state,
      { payload }: PayloadAction<{ extension: CloudExtension }>
    ) {
      const { extension } = payload;

      reportEvent("ExtensionCloudActivate", selectEventData(extension));

      // NOTE: do not save the extensions in the cloud (because the user can just install from the marketplace /
      // or activate the deployment again

      state.extensions.push({ ...extension, active: true });

      void contextMenus.preload([extension]);
    },

    attachExtension(
      state,
      {
        payload,
      }: PayloadAction<{ extensionId: UUID; recipeMetadata: RecipeMetadata }>
    ) {
      const { extensionId, recipeMetadata } = payload;
      const extension = state.extensions.find((x) => x.id === extensionId);
      extension._recipe = recipeMetadata;
    },

    installRecipe(
      state,
      {
        payload,
      }: PayloadAction<{
        recipe: RecipeDefinition;
        services?: Record<RegistryId, UUID>;
        extensionPoints: ExtensionPointConfig[];
        optionsArgs?: UserOptions;
        deployment?: Deployment;
      }>
    ) {
      requireLatestState(state);

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
        services = {},
        config,
      } of extensionPoints) {
        const extensionId = uuidv4();

        const timestamp = new Date().toISOString();

        if (extensionPointId == null) {
          throw new Error("extensionPointId is required");
        }

        if (recipe.updated_at == null) {
          // Since 1.4.8 we're tracking the updated_at timestamp of recipes
          throw new Error("updated_at is required");
        }

        if (recipe.sharing == null) {
          // Since 1.4.6 we're tracking the sharing information of recipes
          throw new Error("sharing is required");
        }

        const extension: PersistedExtension = {
          id: extensionId,
          // Default to `v1` for backward compatability
          apiVersion: recipe.apiVersion ?? "v1",
          _deployment: selectDeploymentContext(deployment),
          _recipe: {
            ...pick(recipe.metadata, ["id", "version", "name", "description"]),
            sharing: recipe.sharing,
            updated_at: recipe.updated_at,
          },
          // Definitions are pushed down into the extensions. That's OK because `resolveDefinitions` determines
          // uniqueness based on the content of the definition. Therefore, bricks will be re-used as necessary
          definitions: recipe.definitions ?? {},
          optionsArgs,
          services: Object.entries(services).map(
            ([outputKey, id]: [OutputKey, RegistryId]) => ({
              outputKey,
              config: auths[id], // eslint-disable-line security/detect-object-injection -- type-checked as RegistryId
              id,
            })
          ),
          label,
          extensionPointId,
          config,
          active: true,
          createTimestamp: timestamp,
          updateTimestamp: timestamp,
        };

        reportEvent("ExtensionActivate", selectEventData(extension));

        // NOTE: do not save the extensions in the cloud (because the user can just install from the marketplace /
        // or activate the deployment again

        state.extensions.push(extension);

        void contextMenus.preload([extension]);
      }
    },
    // XXX: why do we expose a `extensionId` in addition IExtension's `id` prop here?
    saveExtension(
      state,
      {
        payload,
      }: PayloadAction<{
        extension: (IExtension | PersistedExtension) & {
          createTimestamp?: string;
        };
        pushToCloud: boolean;
      }>
    ) {
      requireLatestState(state);

      const timestamp = new Date().toISOString();

      const {
        extension: {
          id,
          apiVersion,
          extensionPointId,
          config,
          definitions,
          label,
          optionsArgs,
          services,
          _deployment,
          createTimestamp = timestamp,
          _recipe,
        },
        pushToCloud,
      } = payload;

      // Support both extensionId and id to keep the API consistent with the shape of the stored extension
      if (id == null) {
        throw new Error("id or extensionId is required");
      }

      if (extensionPointId == null) {
        throw new Error("extensionPointId is required");
      }

      const extension: PersistedExtension = {
        id,
        apiVersion,
        extensionPointId,
        _recipe,
        _deployment: undefined,
        label,
        definitions,
        optionsArgs,
        services,
        config,
        createTimestamp,
        updateTimestamp: timestamp,
        active: true,
      };

      if (pushToCloud && !_deployment) {
        // In the future, we'll want to make the Redux action async. For now, just fail silently in the interface
        void saveUserExtension(extension).catch(reportError);
      }

      const index = state.extensions.findIndex((x) => x.id === id);

      if (index >= 0) {
        // eslint-disable-next-line security/detect-object-injection -- array index from findIndex
        state.extensions[index] = extension;
      } else {
        state.extensions.push(extension);
      }
    },
    updateExtension(
      state,
      action: PayloadAction<{ id: UUID } & Partial<PersistedExtension>>
    ) {
      const { id, ...extensionUpdate } = action.payload;
      const index = state.extensions.findIndex((x) => x.id === id);

      if (index === -1) {
        reportError(
          `Can't find extension in optionsSlice to update. Target extension id: ${id}.`
        );
        return;
      }

      // eslint-disable-next-line security/detect-object-injection -- index is number
      state.extensions[index] = {
        // eslint-disable-next-line security/detect-object-injection -- index is number
        ...state.extensions[index],
        ...extensionUpdate,
      };
    },
    removeExtension(
      state,
      { payload: { extensionId } }: PayloadAction<{ extensionId: UUID }>
    ) {
      requireLatestState(state);

      // Make sure we're not keeping any private data around from Page Editor sessions
      traces.clear(extensionId);

      // NOTE: We aren't deleting the extension on the server. The user must do that separately from the dashboard
      state.extensions = state.extensions.filter((x) => x.id !== extensionId);
    },
  },
});

export const { actions } = optionsSlice;
