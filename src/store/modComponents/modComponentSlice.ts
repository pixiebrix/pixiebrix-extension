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
import { contextMenus } from "@/background/messenger/api";
import { cloneDeep, isEmpty, remove } from "lodash";
import { assertModComponentNotHydrated } from "@/runtime/runtimeUtils";
import { revertAll } from "@/store/commonActions";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { initialState } from "@/store/modComponents/modComponentSliceInitialState";
import { mapModComponentDefinitionToActivatedModComponent } from "@/activation/mapModComponentDefinitionToActivatedModComponent";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import type { UUID } from "@/types/stringTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

type ActivateModPayload = {
  /**
   * The mod definition to activate.
   */
  modDefinition: ModDefinition;
  /**
   * If provided, use the provided the mod component ids instead of generating ids. For use in the Page Editor to
   * maintain the same ids across saves.
   */
  modComponentIds?: UUID[];
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
          modComponentIds = [],
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

      if (
        state.activatedModComponents.some(
          (x) => x.modMetadata.id === modDefinition.metadata.id,
        )
      ) {
        throw new Error(
          "Mod is already activated. Dispatch removeModById first.",
        );
      }

      // Defensive checks against malformed information from the server
      // Since 1.4.6 we're tracking the sharing information of mods
      assertNotNullish(
        modDefinition.sharing,
        "modDefinition.sharing is required",
      );
      assertNotNullish(
        modDefinition.updated_at,
        "modDefinition.updated_at is required",
      );

      if (isEmpty(modDefinition.extensionPoints)) {
        throw new Error("ModDefinition has no components");
      }

      for (const [
        index,
        modComponentDefinition,
      ] of modDefinition.extensionPoints.entries()) {
        // May be null from bad Workshop edit?
        assertNotNullish(
          modComponentDefinition.id,
          "modComponentDefinition.id is required",
        );

        const activatedModComponent: ActivatedModComponent =
          mapModComponentDefinitionToActivatedModComponent({
            modComponentDefinition,
            modDefinition,
            deployment,
            optionsArgs,
            integrationDependencies: configuredDependencies ?? [],
          });

        // Force the mod component id as necessary

        activatedModComponent.id =
          // eslint-disable-next-line security/detect-object-injection -- number
          modComponentIds[index] ?? activatedModComponent.id;

        assertModComponentNotHydrated(activatedModComponent);

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
     * Deactivate mod components associated with the given mod id, if any. Safe to call even if the mod is not activated.
     */
    removeModById(state, { payload: modId }: PayloadAction<RegistryId>) {
      remove(state.activatedModComponents, (x) => x.modMetadata.id === modId);
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialState);
  },
});

export const { actions } = modComponentSlice;

export default modComponentSlice;
