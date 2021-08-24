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
  IExtension,
  PersistedExtension,
  RawServiceConfiguration,
  RegistryId,
  UserOptions,
  UUID,
} from "@/core";
import { orderBy } from "lodash";
import { reportEvent } from "@/telemetry/events";
import { preloadMenus } from "@/background/preload";
import { selectEventData } from "@/telemetry/deployments";
import { uuidv4 } from "@/types/helpers";
import { Except } from "type-fest";
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

      void preloadMenus({ extensions: [extension] });
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
        deployment?: Pick<Deployment, "id" | "updated_at">;
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

        const extension: PersistedExtension = {
          id: extensionId,
          _deployment: deployment
            ? {
                id: deployment.id,
                timestamp: deployment.updated_at,
              }
            : undefined,
          _recipe: recipe.metadata,
          // Definitions are pushed down into the extensions. That's OK because `resolveDefinitions` determines
          // uniqueness based on the content of the definition. Therefore, bricks will be re-used as necessary
          definitions: recipe.definitions ?? {},
          optionsArgs,
          services: Object.entries(services).map(
            ([outputKey, id]: [string, RegistryId]) => ({
              outputKey,
              // @ts-expect-error -- TypeScript is complaining that RegistryId can't index Record<RegistryId, ...>
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

        void preloadMenus({ extensions: [extension] });
      }
    },
    // XXX: why do we expose a `extensionId` in addition IExtension's `id` prop here?
    saveExtension(
      state,
      {
        payload,
      }: PayloadAction<
        Except<IExtension | PersistedExtension, "_recipe"> & {
          extensionId?: UUID;
          createTimestamp?: string;
        }
      >
    ) {
      requireLatestState(state);

      const timestamp = new Date().toISOString();

      const {
        id,
        extensionId,
        extensionPointId,
        config,
        label,
        optionsArgs,
        services,
        _deployment,
        createTimestamp = timestamp,
      } = payload;

      const persistedId = extensionId ?? id;

      // Support both extensionId and id to keep the API consistent with the shape of the stored extension
      if (persistedId) {
        throw new Error("id or extensionId is required");
      } else if (extensionPointId == null) {
        throw new Error("extensionPointId is required");
      }

      const extension: PersistedExtension = {
        id: persistedId,
        extensionPointId,
        // If the user updates an extension, detach it from the recipe -- it's now a personal extension
        _recipe: null,
        label,
        optionsArgs,
        services,
        config,
        createTimestamp,
        updateTimestamp: timestamp,
        active: true,
      };

      if (!_deployment) {
        // In the future, we'll want to make the Redux action async. For now, just fail silently in the interface
        void saveUserExtension(extension).catch(reportError);
      }

      const index = state.extensions.findIndex((x) => x.id === persistedId);

      if (index >= 0) {
        // eslint-disable-next-line security/detect-object-injection -- array index from findIndex
        state.extensions[index] = extension;
      } else {
        state.extensions.push(extension);
      }
    },
    removeExtension(
      state,
      { payload: { extensionId } }: PayloadAction<{ extensionId: UUID }>
    ) {
      requireLatestState(state);
      // NOTE: we aren't deleting the extension on the server. The must do that separately from the dashboard
      state.extensions = state.extensions.filter((x) => x.id !== extensionId);
    },
  },
});
