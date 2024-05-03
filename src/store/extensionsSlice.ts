/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { cloneDeep, partition } from "lodash";
import reportError from "@/telemetry/reportError";
import { type Except } from "type-fest";
import { assertModComponentNotResolved } from "@/runtime/runtimeUtils";
import { revertAll } from "@/store/commonActions";
import {
  type ActivatedModComponent,
  type ModComponentBase,
} from "@/types/modComponentTypes";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { initialState } from "@/store/extensionsSliceInitialState";
import { getActivatedModComponentFromDefinition } from "@/activation/getActivatedModComponentFromDefinition";

type ActivateModPayload = {
  modDefinition: ModDefinition;
  /**
   * Mod integration dependencies with configs filled in
   */
  configuredDependencies?: IntegrationDependency[];
  optionsArgs?: OptionsArgs;
  deployment?: Deployment;
  /**
   * The screen or source of the activation. Used for telemetry.
   * @since 1.7.33
   */
  screen:
    | "marketplace"
    | "extensionConsole"
    | "pageEditor"
    | "background"
    | "starterMod";
  /**
   * True if this is reactivating an already active mod. Used for telemetry.
   * @since 1.7.33
   */
  isReactivate: boolean;
};

const extensionsSlice = createSlice({
  name: "extensions",
  initialState,
  reducers: {
    // Helper method to directly update extensions in tests. Can't use activateStandaloneModDefinition because
    // StandaloneModDefinition doesn't have the _recipe field
    UNSAFE_setExtensions(
      state,
      { payload }: PayloadAction<ActivatedModComponent[]>,
    ) {
      state.extensions = cloneDeep(payload);
    },

    activateStandaloneModDefinition(
      state,
      { payload }: PayloadAction<{ extension: StandaloneModDefinition }>,
    ) {
      const { extension } = payload;

      reportEvent(
        Events.MOD_COMPONENT_CLOUD_ACTIVATE,
        selectEventData(extension),
      );

      // NOTE: do not save the extensions in the cloud (because the user can just activate from the marketplace /
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

      if (extension != null) {
        extension._recipe = recipeMetadata;
      }
    },

    activateMod(
      state,
      {
        payload: {
          modDefinition,
          configuredDependencies,
          optionsArgs,
          deployment,
          screen,
          isReactivate,
        },
      }: PayloadAction<ActivateModPayload>,
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

        const activatedModComponent: ActivatedModComponent =
          getActivatedModComponentFromDefinition({
            modComponentDefinition,
            modDefinition,
            deployment,
            optionsArgs,
            integrationDependencies: configuredDependencies ?? [],
          });

        assertModComponentNotResolved(activatedModComponent);

        reportEvent(
          Events.STARTER_BRICK_ACTIVATE,
          selectEventData(activatedModComponent),
        );

        // NOTE: do not save the extensions in the cloud (because the user can just activate from the marketplace /
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
        reinstall: isReactivate,
      });
    },
    /**
     * Warning: this action saves the mod component to Redux, but it does not save the mod component to the cloud.
     * You are likely looking for the `useUpsertModComponentFormState` hook, which saves the mod component
     * form state using this action with options to push it to the server.
     *
     * Prefer using `useUpsertModComponentFormState` over calling this action directly.
     *
     * @see useUpsertModComponentFormState
     *
     * XXX: why do we expose a `extensionId` in addition ModComponentBase's `id` prop here?
     */
    saveModComponent(
      state,
      {
        payload,
      }: PayloadAction<{
        modComponent: (ModComponentBase | ActivatedModComponent) & {
          updateTimestamp: Timestamp;
        };
      }>,
    ) {
      const {
        modComponent: {
          id,
          apiVersion,
          extensionPointId,
          config,
          definitions,
          label,
          optionsArgs,
          integrationDependencies,
          updateTimestamp,
          _recipe,
        },
      } = payload;

      // Support both extensionId and id to keep the API consistent with the shape of the stored extension
      if (id == null) {
        throw new Error("id or extensionId is required");
      }

      if (extensionPointId == null) {
        throw new Error("extensionPointId is required");
      }

      const modComponent: Except<
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
        // We are unfortunately not rehydrating the createTimestamp properly from the server, so in most cases the
        // createTimestamp saved in Redux won't match the timestamp on the server. This is OK for now because
        // we don't use the exact value of createTimestamp for the time being.
        // See https://github.com/pixiebrix/pixiebrix-extension/pull/7229 for more context
        createTimestamp: updateTimestamp,
        updateTimestamp,
        active: true,
      };

      assertModComponentNotResolved(modComponent);

      const index = state.extensions.findIndex((x) => x.id === id);

      if (index >= 0) {
        // eslint-disable-next-line security/detect-object-injection -- array index from findIndex
        state.extensions[index] = modComponent;
      } else {
        state.extensions.push(modComponent);
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
      } as ActivatedModComponent;
    },

    updateRecipeMetadataForExtensions(
      state,
      action: PayloadAction<ModComponentBase["_recipe"]>,
    ) {
      const metadata = action.payload;
      const recipeExtensions = state.extensions.filter(
        (extension) => extension._recipe?.id === metadata?.id,
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
