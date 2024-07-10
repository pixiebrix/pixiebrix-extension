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
  type EditorStateV5,
  type EditorState,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import produce, { type Draft } from "immer";
import {
  FOUNDATION_NODE_ID,
  makeInitialBrickConfigurationUIState,
} from "@/pageEditor/store/editor/uiState";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type UUID } from "@/types/stringTypes";

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

/**
 * Recalculate the pipeline map for each mod component form state.
 * Required because of the change from `extension.blockPipeline` to `modComponent.brickPipeline`.
 *
 * See https://github.com/pixiebrix/pixiebrix-extension/issues/8781
 *
 * Code copied from `syncBrickConfigurationUIStates` to prevent unwanted webext messenger code
 * from being included in the bundle.
 */
function migrateEditorStateV4(
  state: EditorStateV4 & PersistedState,
): EditorStateV5 & PersistedState {
  return produce(state, (draft: Draft<EditorState>) => {
    for (const modComponentFormState of draft.modComponentFormStates) {
      const brickPipelineUIState =
        draft.brickPipelineUIStateById[modComponentFormState.uuid];

      assertNotNullish(
        brickPipelineUIState,
        `Brick Pipeline UI State not found for ${modComponentFormState.uuid}`,
      );

      const pipelineMap = getPipelineMap(
        modComponentFormState.modComponent.brickPipeline,
      );

      brickPipelineUIState.pipelineMap = pipelineMap;

      // Pipeline brick instance IDs may have changed
      if (pipelineMap[brickPipelineUIState.activeNodeId] == null) {
        brickPipelineUIState.activeNodeId = FOUNDATION_NODE_ID;
      }
      /* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

      // Remove BrickConfigurationUIStates for invalid node IDs
      for (const nodeId of Object.keys(
        brickPipelineUIState.nodeUIStates,
      ) as UUID[]) {
        // Don't remove the foundation BrickConfigurationUIState
        if (nodeId !== FOUNDATION_NODE_ID && pipelineMap[nodeId] == null) {
          delete brickPipelineUIState.nodeUIStates[nodeId];
        }
      }

      // Add missing BrickConfigurationUIStates
      for (const nodeId of Object.keys(pipelineMap) as UUID[]) {
        brickPipelineUIState.nodeUIStates[nodeId] ??=
          makeInitialBrickConfigurationUIState(nodeId);
      }
      /* eslint-enable security/detect-object-injection */
    }
  });
}
