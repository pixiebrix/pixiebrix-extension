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

import { type MigrationManifest, type PersistedState } from "redux-persist";
import { mapValues, omit } from "lodash";
import {
  type BaseFormStateV1,
  type BaseFormStateV2,
  type BaseFormStateV3,
  type BaseFormStateV4,
  type BaseFormStateV5,
  type BaseFormStateV6,
  type BaseModComponentStateV1,
  type BaseModComponentStateV2,
} from "../pageEditor/store/editor/baseFormStateTypes";
import {
  type IntegrationDependencyV1,
  type IntegrationDependencyV2,
} from "../integrations/integrationTypes";
import {
  type EditorStateV1,
  type EditorStateV10,
  type EditorStateV11,
  type EditorStateV2,
  type EditorStateV3,
  type EditorStateV4,
  type EditorStateV5,
  type EditorStateV6,
  type EditorStateV7,
  type EditorStateV8,
  type EditorStateV9,
} from "../pageEditor/store/editor/pageEditorTypes";
import { type Draft, produce } from "immer";
import { DataPanelTabKey } from "../pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { makeInitialDataTabState } from "../pageEditor/store/editor/uiState";
import { type BrickConfigurationUIState } from "../pageEditor/store/editor/uiStateTypes";
import {
  createNewUnsavedModMetadata,
  emptyModOptionsDefinitionFactory,
  emptyModVariablesDefinitionFactory,
} from "../utils/modUtils";
import { type SetOptional } from "type-fest";

export const migrations: MigrationManifest = {
  // Redux-persist defaults to version: -1; Initialize to positive-1-indexed
  // state version to match state type names
  0: (state) => state,
  1: (state) => state,
  2: (state: EditorStateV1 & PersistedState) => migrateEditorStateV1(state),
  3: (state: EditorStateV2 & PersistedState) => migrateEditorStateV2(state),
  4: (state: EditorStateV3 & PersistedState) => migrateEditorStateV3(state),
  5: (state: EditorStateV4 & PersistedState) => migrateEditorStateV4(state),
  6: (state: EditorStateV5 & PersistedState) => migrateEditorStateV5(state),
  7: (state: EditorStateV6 & PersistedState) => migrateEditorStateV6(state),
  8: (state: EditorStateV7 & PersistedState) => migrateEditorStateV7(state),
  9: (state: EditorStateV8 & PersistedState) => migrateEditorStateV8(state),
  10: (state: EditorStateV9 & PersistedState) => migrateEditorStateV9(state),
  11: (state: EditorStateV10 & PersistedState) => migrateEditorStateV10(state),
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

/** @internal */
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

/** @internal */
export function migrateEditorStateV2({
  activeElementId,
  activeRecipeId,
  expandedRecipeId,
  elements,
  elementUIStates,
  copiedBlock,
  dirtyRecipeOptionsById,
  dirtyRecipeMetadataById,
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
    brickPipelineUIStateById: elementUIStates,
    copiedBrick: copiedBlock,
    dirtyModOptionsById: dirtyRecipeOptionsById,
    dirtyModMetadataById: dirtyRecipeMetadataById,
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

/** @internal */
export function migrateEditorStateV3({
  modComponentFormStates,
  deletedModComponentFormStatesByModId,
  ...rest
}: EditorStateV3 & PersistedState): EditorStateV4 & PersistedState {
  return {
    ...rest,
    modComponentFormStates: modComponentFormStates.map((element) =>
      migrateFormStateV2(element),
    ),
    deletedModComponentFormStatesByModId: mapValues(
      deletedModComponentFormStatesByModId,
      (formStates) => formStates.map((element) => migrateFormStateV2(element)),
    ),
  };
}

function migrateFormStateV3({
  type,
  ...rest
}: BaseFormStateV3): BaseFormStateV4 {
  return rest;
}

/** @internal */
export function migrateEditorStateV4({
  inserting,
  modComponentFormStates,
  deletedModComponentFormStatesByModId,
  ...rest
}: EditorStateV4 & PersistedState): EditorStateV5 & PersistedState {
  return {
    ...rest,
    insertingStarterBrickType: inserting,
    modComponentFormStates: modComponentFormStates.map((element) =>
      migrateFormStateV3(element),
    ) as BaseFormStateV4[],
    deletedModComponentFormStatesByModId: mapValues(
      deletedModComponentFormStatesByModId,
      (formStates) => formStates.map((element) => migrateFormStateV3(element)),
    ) as Record<string, BaseFormStateV4[]>,
  };
}

/** @internal */
export function migrateEditorStateV5({
  insertingStarterBrickType,
  ...rest
}: EditorStateV5 & PersistedState): EditorStateV6 & PersistedState {
  return rest;
}

/** @internal */
export function migrateEditorStateV6(
  state: EditorStateV6 & PersistedState,
): EditorStateV7 & PersistedState {
  // Reset the Data Panel state using the current set of DataPanelTabKeys
  return produce(state, (draft) => {
    for (const uiState of Object.values(draft.brickPipelineUIStateById)) {
      for (const nodeUiState of Object.values(uiState.nodeUIStates ?? {})) {
        nodeUiState.dataPanel = {
          ...Object.fromEntries(
            Object.values(DataPanelTabKey).map((tabKey) => [
              tabKey,
              makeInitialDataTabState(),
            ]),
          ),
          activeTabKey: null,
        } as BrickConfigurationUIState["dataPanel"];
      }
    }
  });
}

/** @internal */
export function migrateEditorStateV7(
  state: EditorStateV7 & PersistedState,
): EditorStateV8 & PersistedState {
  // Reset the Data Panel state using the current set of DataPanelTabKeys
  return produce(state, (draft) => {
    for (const formState of draft.modComponentFormStates) {
      (formState as BaseFormStateV5).variablesDefinition =
        emptyModVariablesDefinitionFactory();
    }

    for (const formStates of Object.values(
      draft.deletedModComponentFormStatesByModId,
    )) {
      for (const formState of formStates) {
        (formState as BaseFormStateV5).variablesDefinition =
          emptyModVariablesDefinitionFactory();
      }
    }
  }) as EditorStateV8 & PersistedState;
}

/** @internal */
export function migrateEditorStateV8(
  state: EditorStateV8 & PersistedState,
): EditorStateV9 & PersistedState {
  return produce(state, (draft) => {
    // Don't need to also loop over deletedModComponentFormStatesByModId, because there can't be any standalone
    // mod components in there. (Standalone mods when deleted are removed from the editor state entirely.)
    for (const formState of draft.modComponentFormStates) {
      (formState as BaseFormStateV6).modMetadata ??=
        createNewUnsavedModMetadata({
          modName: formState.label,
        });
    }
  }) as EditorStateV9 & PersistedState;
}

/** @internal */
export function migrateEditorStateV9(
  state: EditorStateV9 & PersistedState,
): EditorStateV10 & PersistedState {
  return produce(
    state as unknown as EditorStateV10 & PersistedState,
    (draft) => {
      // Alias the old draft type for deleting old properties
      const oldDraft = draft as unknown as Draft<
        SetOptional<EditorStateV9, "dirtyModOptionsById">
      >;

      // Rename dirtyModOptionsById to dirtyModOptionsDefinitionById
      draft.dirtyModOptionsDefinitionsById = oldDraft.dirtyModOptionsById ?? {};
      delete oldDraft.dirtyModOptionsById;

      // Populate dirtyModOptionsArgsById and drop optionsArgs from modComponentFormStates
      draft.dirtyModOptionsArgsById = {};
      for (const formState of oldDraft.modComponentFormStates) {
        // If the form state is dirty, populate the dirty optionsArgs. (They might not actually be dirty, to know
        // for sure, would need to compare the form state to the activate mods. However, if no form state is dirty,
        // we know the optionsArgs are not dirty.)
        if (oldDraft.dirty[formState.uuid]) {
          draft.dirtyModOptionsArgsById[formState.modMetadata.id] =
            formState.optionsArgs;
        }

        delete (formState as SetOptional<BaseFormStateV5, "optionsArgs">)
          .optionsArgs;
      }
    },
  );
}

/** @internal */
export function migrateEditorStateV10(
  state: EditorStateV10 & PersistedState,
): EditorStateV11 & PersistedState {
  return produce(
    state as unknown as EditorStateV11 & PersistedState,
    (draft) => {
      // Alias the old draft type for deleting old properties
      const oldDraft = draft as unknown as Draft<
        SetOptional<
          EditorStateV10,
          | "dirtyModOptionsDefinitionsById"
          | "deletedModComponentFormStatesByModId"
        >
      >;

      // Rename dirtyModOptionsDefinitionsById to dirtyModOptionsDefinitionById
      draft.dirtyModOptionsDefinitionById =
        oldDraft.dirtyModOptionsDefinitionsById ??
        emptyModOptionsDefinitionFactory();
      delete oldDraft.dirtyModOptionsDefinitionsById;

      // Rename dirtyModOptionsDefinitionsById to deletedModComponentFormStateIdsByModId
      draft.deletedModComponentFormStateIdsByModId = mapValues(
        oldDraft.deletedModComponentFormStatesByModId,
        (formStates) => formStates.map((x) => x.uuid),
      );
      delete oldDraft.deletedModComponentFormStatesByModId;

      // Populate dirtyModOptionsArgsById and drop optionsArgs from modComponentFormStates
      draft.dirtyModVariablesDefinitionById = {};
      for (const formState of oldDraft.modComponentFormStates) {
        // If the form state is dirty, populate the dirty optionsArgs. (They might not actually be dirty, to know
        // for sure, would need to compare the form state to the activate mods. However, if no form state is dirty,
        // we know the optionsArgs are not dirty.)
        if (oldDraft.dirty[formState.uuid]) {
          draft.dirtyModVariablesDefinitionById[formState.modMetadata.id] =
            formState.variablesDefinition;
        }

        delete (
          formState as SetOptional<BaseFormStateV6, "variablesDefinition">
        ).variablesDefinition;
      }
    },
  );
}
