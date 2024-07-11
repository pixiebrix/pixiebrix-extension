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

import { type PersistedState, type MigrationManifest } from "redux-persist";
import { mapValues, omit } from "lodash";
import {
  type BaseFormStateV3,
  type BaseFormStateV1,
  type BaseFormStateV2,
  type BaseModComponentStateV1,
  type BaseModComponentStateV2,
} from "@/pageEditor/store/editor/baseFormStateTypes";
import {
  type IntegrationDependencyV1,
  type IntegrationDependencyV2,
} from "@/integrations/integrationTypes";
import {
  type EditorStateV2,
  type EditorStateV1,
  type EditorStateV3,
  type EditorStateV4,
  EditorStateV5,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";

export const migrations: MigrationManifest = {
  // Redux-persist defaults to version: -1; Initialize to positive-1-indexed
  // state version to match state type names
  0: (state) => state,
  1: (state) => state,
  2: (state: EditorStateV1 & PersistedState) => migrateEditorStateV1(state),
  3: (state: EditorStateV2 & PersistedState) => migrateEditorStateV2(state),
  4: (state: EditorStateV3 & PersistedState) => migrateEditorStateV3(state),
  5: (state: EditorStateV4 & PersistedState) => migrateEditorStateV4(state),
};

export function migrateIntegrationDependenciesV1toV2(
  services?: IntegrationDependencyV1[],
): IntegrationDependencyV2[] {
  if (!services) {
    return [];
  }

  return services.map((dependency) => ({
    integrationId: dependency.id,
    outputKey: dependency.outputKey,
    configId: dependency.config,
    isOptional: dependency.isOptional,
    apiVersion: dependency.apiVersion,
  }));
}

function migrateFormStateV1(state: BaseFormStateV1): BaseFormStateV2 {
  return {
    ...omit(state, "services"),
    integrationDependencies: migrateIntegrationDependenciesV1toV2(
      state.services,
    ),
  };
}

export function migrateEditorStateV1(
  state: EditorStateV1 & PersistedState,
): EditorStateV2 & PersistedState {
  return {
    ...state,
    elements: state.elements.map((formState) => migrateFormStateV1(formState)),
    deletedElementsByRecipeId: mapValues(
      state.deletedElementsByRecipeId,
      (formStates) =>
        formStates.map((formState) => migrateFormStateV1(formState)),
    ),
  };
}

export function migrateEditorStateV2({
  activeElementId,
  activeRecipeId,
  expandedRecipeId,
  elements,
  knownEditable,
  elementUIStates,
  copiedBlock,
  dirtyRecipeOptionsById,
  dirtyRecipeMetadataById,
  addBlockLocation,
  keepLocalCopyOnCreateRecipe,
  deletedElementsByRecipeId,
  availableInstalledIds,
  isPendingInstalledExtensions,
  availableDynamicIds,
  isPendingDynamicExtensions,
  ...rest
}: EditorStateV2 & PersistedState): EditorStateV3 & PersistedState {
  return {
    ...rest,
    activeModComponentId: activeElementId,
    activeModId: activeRecipeId,
    expandedModId: expandedRecipeId,
    modComponentFormStates: elements,
    knownEditableBrickIds: knownEditable,
    brickPipelineUIStateById: elementUIStates,
    copiedBrick: copiedBlock,
    dirtyModOptionsById: dirtyRecipeOptionsById,
    dirtyModMetadataById: dirtyRecipeMetadataById,
    addBrickLocation: addBlockLocation,
    keepLocalCopyOnCreateMod: keepLocalCopyOnCreateRecipe,
    deletedModComponentFormStatesByModId: deletedElementsByRecipeId,
    availableActivatedModComponentIds: availableInstalledIds,
    isPendingAvailableActivatedModComponents: isPendingInstalledExtensions,
    availableDraftModComponentIds: availableDynamicIds,
    isPendingDraftModComponents: isPendingDynamicExtensions,
  };
}

function migrateModComponentStateV1(
  state: BaseModComponentStateV1,
): BaseModComponentStateV2 {
  return {
    brickPipeline: state.blockPipeline,
  };
}

function migrateFormStateV2(state: BaseFormStateV2): BaseFormStateV3 {
  return {
    ...omit(state, "recipe", "extension", "extensionPoint"),
    modComponent: migrateModComponentStateV1(state.extension),
    starterBrick: state.extensionPoint,
    modMetadata: state.recipe,
  };
}

export function migrateEditorStateV3({
  modComponentFormStates,
  deletedModComponentFormStatesByModId,
  ...rest
}: EditorStateV3 & PersistedState): EditorStateV4 & PersistedState {
  return {
    ...rest,
    modComponentFormStates: modComponentFormStates.map((element) =>
      migrateFormStateV2(element),
    ) as ModComponentFormState[],
    deletedModComponentFormStatesByModId: mapValues(
      deletedModComponentFormStatesByModId,
      (formStates) => formStates.map((element) => migrateFormStateV2(element)),
    ) as Record<string, ModComponentFormState[]>,
  };
}

export function migrateEditorStateV4({
  inserting,
  ...rest
}: EditorStateV4 & PersistedState): EditorStateV5 & PersistedState {
  return {
    ...rest,
    insertingStarterBrickType: inserting,
  };
}
