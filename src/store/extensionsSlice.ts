/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  type Deployment,
  type StandaloneModDefinition,
} from "@/types/contract";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { contextMenus } from "@/background/messenger/api";
import { uuidv4 } from "@/types/helpers";
import { cloneDeep, partition } from "lodash";
import { saveUserExtension } from "@/services/apiClient";
import reportError from "@/telemetry/reportError";
import { type Except } from "type-fest";
import { assertModComponentNotResolved } from "@/runtime/runtimeUtils";
import { revertAll } from "@/store/commonActions";
import {
  type ActivatedModComponent,
  type ModComponentBase,
} from "@/types/modComponentTypes";
import { type UUID } from "@/types/stringTypes";
import {
  type ModComponentDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import { type InnerDefinitions, type RegistryId } from "@/types/registryTypes";
import { type ApiVersion, type OptionsArgs } from "@/types/runtimeTypes";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { initialState } from "@/store/extensionsSliceInitialState";
import { pickModDefinitionMetadata } from "@/modDefinitions/util/pickModDefinitionMetadata";
import getModDefinitionIntegrationIds from "@/integrations/util/getModDefinitionIntegrationIds";

type ActivateModComponentParam = {
  modComponentDefinition: ModComponentDefinition;
  apiVersion: ApiVersion;
  _deployment: ModComponentBase["_deployment"];
  _recipe: ModComponentBase["_recipe"];
  definitions: InnerDefinitions;
  optionsArgs: OptionsArgs;
  integrationDependencies: IntegrationDependency[];
};

/**
 * Transform a given ModComponentDefinition into an ActivatedModComponent.
 * Note: This function has no side effects, it's just a type-transformer.
 *       It does NOT save the activated mod component anywhere.
 * @param modComponentDefinition the component definition to activate
 * @param apiVersion the pixiebrix mod api version
 * @param _deployment the deployment that the component belongs to, if there is one
 * @param _recipe the metadata for the mod that the component belongs to
 * @param definitions inner definitions for the component
 * @param optionsArgs mod option inputs for the mod this component belongs to
 * @param integrationDependencies the configured dependencies for the mod this component belongs to
 */
function getActivatedModComponentFromDefinition<
  Config extends UnknownObject = UnknownObject,
>({
  modComponentDefinition,
  apiVersion,
  _deployment,
  _recipe,
  definitions,
  optionsArgs,
  integrationDependencies,
}: ActivateModComponentParam): ActivatedModComponent<Config> {
  const nowTimestamp = new Date().toISOString();

  const activatedModComponent = {
    id: uuidv4(),
    apiVersion,
    _deployment,
    _recipe,
    definitions,
    optionsArgs,
    label: modComponentDefinition.label,
    extensionPointId: modComponentDefinition.id,
    config: modComponentDefinition.config as Config,
    active: true,
    createTimestamp: nowTimestamp,
    updateTimestamp: nowTimestamp,
  } as ActivatedModComponent<Config>;

  // Set optional fields only if the source mod component has a value. Normalizing the values
  // here makes testing harder because we then have to account for the normalized value in assertions.

  if (modComponentDefinition.services) {
    const modIntegrationIds = getModDefinitionIntegrationIds({
      extensionPoints: [modComponentDefinition],
    });
    activatedModComponent.integrationDependencies =
      integrationDependencies.filter(({ integrationId }) =>
        modIntegrationIds.includes(integrationId),
      );
  }

  if (modComponentDefinition.permissions) {
    activatedModComponent.permissions = modComponentDefinition.permissions;
  }

  if (modComponentDefinition.templateEngine) {
    activatedModComponent.templateEngine =
      modComponentDefinition.templateEngine;
  }

  return activatedModComponent;
}

type InstallModPayload = {
  modDefinition: ModDefinition;
  /**
   * Mod integration dependencies with configs filled in
   */
  configuredDependencies?: IntegrationDependency[];
  optionsArgs?: OptionsArgs;
  deployment?: Deployment;
  /**
   * The screen or source of the installation. Used for telemetry.
   * @since 1.7.33
   */
  screen:
    | "marketplace"
    | "extensionConsole"
    | "pageEditor"
    | "background"
    | "starterMod";
  /**
   * True if this is reinstalling an already active mod. Used for telemetry.
   * @since 1.7.33
   */
  isReinstall: boolean;
};

const extensionsSlice = createSlice({
  name: "extensions",
  initialState,
  reducers: {
    // Helper method to directly update extensions in tests. Can't use installCloudExtension because
    // StandaloneModDefinition doesn't have the _recipe field
    UNSAFE_setExtensions(
      state,
      { payload }: PayloadAction<ActivatedModComponent[]>,
    ) {
      state.extensions = cloneDeep(payload);
    },

    installCloudExtension(
      state,
      { payload }: PayloadAction<{ extension: StandaloneModDefinition }>,
    ) {
      const { extension } = payload;

      reportEvent(
        Events.MOD_COMPONENT_CLOUD_ACTIVATE,
        selectEventData(extension),
      );

      // NOTE: do not save the extensions in the cloud (because the user can just install from the marketplace /
      // or activate the deployment again

      state.extensions.push({ ...extension, active: true });

      void contextMenus.preload([extension]);
    },

    attachExtension(
      state,
      {
        payload,
      }: PayloadAction<{
        extensionId: UUID;
        recipeMetadata: ModComponentBase["_recipe"];
      }>,
    ) {
      const { extensionId, recipeMetadata } = payload;
      const extension = state.extensions.find((x) => x.id === extensionId);
      extension._recipe = recipeMetadata;
    },

    installMod(
      state,
      {
        payload: {
          modDefinition,
          configuredDependencies,
          optionsArgs,
          deployment,
          screen,
          isReinstall,
        },
      }: PayloadAction<InstallModPayload>,
    ) {
      for (const modComponentDefinition of modDefinition.extensionPoints) {
        // May be null from bad Workshop edit?
        if (modComponentDefinition.id == null) {
          throw new Error("modComponentDefinition.id is required");
        }

        if (modDefinition.updated_at == null) {
          // Since 1.4.8 we're tracking the updated_at timestamp of mods
          throw new Error("updated_at is required");
        }

        if (modDefinition.sharing == null) {
          // Since 1.4.6 we're tracking the sharing information of mods
          throw new Error("sharing is required");
        }

        const activatedModComponent = getActivatedModComponentFromDefinition({
          modComponentDefinition,
          // Default to `v1` for backward compatability
          apiVersion: modDefinition.apiVersion ?? "v1",
          _deployment: deployment && {
            id: deployment.id,
            timestamp: deployment.updated_at,
            active: deployment.active,
          },
          _recipe: pickModDefinitionMetadata(modDefinition),
          // Definitions are pushed down into the mod components. That's OK because `resolveDefinitions` determines
          // uniqueness based on the content of the definition. Therefore, bricks will be re-used as necessary
          definitions: modDefinition.definitions ?? {},
          optionsArgs,
          integrationDependencies: configuredDependencies ?? [],
        });

        assertModComponentNotResolved(activatedModComponent);

        reportEvent(
          Events.STARTER_BRICK_ACTIVATE,
          selectEventData(activatedModComponent),
        );

        // NOTE: do not save the extensions in the cloud (because the user can just install from the marketplace /
        // or activate the deployment again
        state.extensions.push(activatedModComponent);

        // Ensure context menus are available on all existing tabs
        void contextMenus.preload([activatedModComponent]);
      }

      reportEvent(Events.MOD_ACTIVATE, {
        blueprintId: modDefinition.metadata.id,
        blueprintVersion: modDefinition.metadata.version,
        deploymentId: deployment?.id,
        screen,
        reinstall: isReinstall,
      });
    },
    // XXX: why do we expose a `extensionId` in addition ModComponentBase's `id` prop here?
    saveExtension(
      state,
      {
        payload,
      }: PayloadAction<{
        extension: (ModComponentBase | ActivatedModComponent) & {
          createTimestamp?: string;
        };
        pushToCloud: boolean;
      }>,
    ) {
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
          integrationDependencies,
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

      const extension: Except<
        ActivatedModComponent,
        "_unresolvedModComponentBrand"
      > = {
        id,
        apiVersion,
        extensionPointId,
        _recipe,
        _deployment: undefined,
        label,
        definitions,
        optionsArgs,
        integrationDependencies,
        config,
        createTimestamp,
        updateTimestamp: timestamp,
        active: true,
      };

      assertModComponentNotResolved(extension);

      if (pushToCloud && !_deployment) {
        // In the future, we'll want to make the Redux action async. For now, just fail silently in the interface
        void saveUserExtension(extension);
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
      action: PayloadAction<{ id: UUID } & Partial<ActivatedModComponent>>,
    ) {
      const { id, ...extensionUpdate } = action.payload;
      const index = state.extensions.findIndex((x) => x.id === id);

      if (index === -1) {
        reportError(
          new Error(
            `Can't find extension in optionsSlice to update. Target extension id: ${id}.`,
          ),
        );
        return;
      }

      // eslint-disable-next-line security/detect-object-injection -- index is number
      state.extensions[index] = {
        ...state.extensions.at(index),
        ...extensionUpdate,
      };
    },

    updateRecipeMetadataForExtensions(
      state,
      action: PayloadAction<ModComponentBase["_recipe"]>,
    ) {
      const metadata = action.payload;
      const recipeExtensions = state.extensions.filter(
        (extension) => extension._recipe?.id === metadata.id,
      );
      for (const extension of recipeExtensions) {
        extension._recipe = metadata;
      }
    },

    removeRecipeById(state, { payload: recipeId }: PayloadAction<RegistryId>) {
      const [, extensions] = partition(
        state.extensions,
        (x) => x._recipe?.id === recipeId,
      );

      state.extensions = extensions;
    },

    removeExtensions(
      state,
      { payload: { extensionIds } }: PayloadAction<{ extensionIds: UUID[] }>,
    ) {
      // NOTE: We aren't deleting the extension on the server. The user must do that separately from the dashboard
      state.extensions = state.extensions.filter(
        (x) => !extensionIds.includes(x.id),
      );
    },

    removeExtension(
      state,
      { payload: { extensionId } }: PayloadAction<{ extensionId: UUID }>,
    ) {
      // NOTE: We aren't deleting the extension on the server. The user must do that separately from the dashboard
      state.extensions = state.extensions.filter((x) => x.id !== extensionId);
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialState);
  },
});

export const { actions } = extensionsSlice;

export default extensionsSlice;
