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
import { type Deployment } from "@/types/contract";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { contextMenus } from "@/background/messenger/api";
import { cloneDeep, partition } from "lodash";
import { type Except } from "type-fest";
import { assertModComponentNotHydrated } from "@/runtime/runtimeUtils";
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
import { initialState } from "@/store/modComponents/modComponentSliceInitialState";
import { mapModComponentDefinitionToActivatedModComponent } from "@/activation/mapModComponentDefinitionToActivatedModComponent";
import { isInnerDefinitionRegistryId } from "@/types/helpers";

type ActivateModPayload = {
  /**
   * The mod definition to activate.
   */
  modDefinition: ModDefinition;
  /**
   * Mod integration dependencies with configs filled in
   */
  configuredDependencies?: IntegrationDependency[];
  /**
   * Options supplied by the user during activation, or the deployment.
   */
  optionsArgs?: OptionsArgs;
  /**
   * The deployment that activated the mod. Or undefined if not associated with a deployment.
   */
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

const modComponentSlice = createSlice({
  name: "extensions",
  initialState,
  reducers: {
    // Helper method to directly update mod components in tests
    UNSAFE_setModComponents(
      state,
      { payload }: PayloadAction<ActivatedModComponent[]>,
    ) {
      state.activatedModComponents = cloneDeep(payload);
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
      if (isInnerDefinitionRegistryId(modDefinition.metadata.id)) {
        throw new Error(
          "Unsaved Page Editor mod definitions should not be included in the modComponentSlice",
        );
      }

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
          mapModComponentDefinitionToActivatedModComponent({
            modComponentDefinition,
            modDefinition,
            deployment,
            optionsArgs,
            integrationDependencies: configuredDependencies ?? [],
          });

        assertModComponentNotHydrated(activatedModComponent);

        reportEvent(
          Events.STARTER_BRICK_ACTIVATE,
          selectEventData(activatedModComponent),
        );

        state.activatedModComponents.push(activatedModComponent);

        // Ensure context menus are available on all existing tabs
        void contextMenus.preload([activatedModComponent]);
      }

      reportEvent(Events.MOD_ACTIVATE, {
        modId: modDefinition.metadata.id,
        modVersion: modDefinition.metadata.version,
        deploymentId: deployment?.id,
        screen,
        reinstall: isReactivate,
      });
    },

    /**
     * Prefer using `useUpsertModComponentFormState` over calling this action directly.
     *
     * @see useUpsertModComponentFormState
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
          modMetadata,
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
        "_serializedModComponentBrand"
      > = {
        id,
        apiVersion,
        extensionPointId,
        modMetadata,
        deploymentMetadata: undefined,
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

      assertModComponentNotHydrated(modComponent);

      const index = state.activatedModComponents.findIndex((x) => x.id === id);

      if (index >= 0) {
        // eslint-disable-next-line security/detect-object-injection -- array index from findIndex
        state.activatedModComponents[index] = modComponent;
      } else {
        state.activatedModComponents.push(modComponent);
      }
    },

    /**
     * Update the mod metadata of all mod components associated with the given mod id.
     */
    updateModMetadata(
      state,
      action: PayloadAction<ModComponentBase["modMetadata"]>,
    ) {
      const metadata = action.payload;
      for (const modComponent of state.activatedModComponents) {
        if (modComponent.modMetadata.id === metadata?.id) {
          modComponent.modMetadata = metadata;
        }
      }
    },

    /**
     * Deactivate mod components associated with the given mod id
     */
    removeModById(state, { payload: modId }: PayloadAction<RegistryId>) {
      const [, modComponents] = partition(
        state.activatedModComponents,
        (x) => x.modMetadata.id === modId,
      );

      state.activatedModComponents = modComponents;
    },

    /**
     * Deactivate a single mod component by id. Prefer using removeModById instead
     * @see removeModById
     */
    removeModComponent(
      state,
      { payload: { modComponentId } }: PayloadAction<{ modComponentId: UUID }>,
    ) {
      // NOTE: We aren't deleting the mod component/definition on the server.
      // The user must do that separately from the dashboard
      state.activatedModComponents = state.activatedModComponents.filter(
        (x) => x.id !== modComponentId,
      );
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialState);
  },
});

export const { actions } = modComponentSlice;

export default modComponentSlice;
