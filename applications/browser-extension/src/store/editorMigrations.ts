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
} from "@/pageEditor/store/editor/baseFormStateTypes";
import {
  type IntegrationDependencyV1,
  type IntegrationDependencyV2,
} from "@/integrations/integrationTypes";
import {
  type EditorStateMigratedV12,
  type EditorStateMigratedV1,
  type EditorStateMigratedV10,
  type EditorStateMigratedV11,
  type EditorStateMigratedV2,
  type EditorStateMigratedV3,
  type EditorStateMigratedV4,
  type EditorStateMigratedV5,
  type EditorStateMigratedV6,
  type EditorStateMigratedV7,
  type EditorStateMigratedV8,
  type EditorStateMigratedV9,
  type EditorStateSynced,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { type Draft, produce } from "immer";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { makeInitialDataTabState } from "@/pageEditor/store/editor/uiState";
import { type BrickConfigurationUIState } from "@/pageEditor/store/editor/uiStateTypes";
import {
  createNewUnsavedModMetadata,
  emptyModOptionsDefinitionFactory,
  emptyModVariablesDefinitionFactory,
} from "@/utils/modUtils";
import { type SetOptional } from "type-fest";
import { initialSyncedState } from "@/store/editorInitialState";

export const migrations: MigrationManifest = {
  // Redux-persist defaults to version: -1; Initialize to positive-1-indexed
  // state version to match state type names
  0: (state) => state,
  1: (state) => state,
  2: (state: EditorStateMigratedV1 & PersistedState) =>
    migrateEditorStateV1(state),
  3: (state: EditorStateMigratedV2 & PersistedState) =>
    migrateEditorStateV2(state),
  4: (state: EditorStateMigratedV3 & PersistedState) =>
    migrateEditorStateV3(state),
  5: (state: EditorStateMigratedV4 & PersistedState) =>
    migrateEditorStateV4(state),
  6: (state: EditorStateMigratedV5 & PersistedState) =>
    migrateEditorStateV5(state),
  7: (state: EditorStateMigratedV6 & PersistedState) =>
    migrateEditorStateV6(state),
  8: (state: EditorStateMigratedV7 & PersistedState) =>
    migrateEditorStateV7(state),
  9: (state: EditorStateMigratedV8 & PersistedState) =>
    migrateEditorStateV8(state),
  10: (state: EditorStateMigratedV9 & PersistedState) =>
    migrateEditorStateV9(state),
  11: (state: EditorStateMigratedV10 & PersistedState) =>
    migrateEditorStateV10(state),
  12: (state: EditorStateMigratedV11 & PersistedState) =>
    migrateEditorStateV11(state),
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
  state: EditorStateMigratedV1 & PersistedState,
): EditorStateMigratedV2 & PersistedState {
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
}: EditorStateMigratedV2 & PersistedState): EditorStateMigratedV3 &
  PersistedState {
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
}: EditorStateMigratedV3 & PersistedState): EditorStateMigratedV4 &
  PersistedState {
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
}: EditorStateMigratedV4 & PersistedState): EditorStateMigratedV5 &
  PersistedState {
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
}: EditorStateMigratedV5 & PersistedState): EditorStateMigratedV6 &
  PersistedState {
  return rest;
}

/** @internal */
export function migrateEditorStateV6(
  state: EditorStateMigratedV6 & PersistedState,
): EditorStateMigratedV7 & PersistedState {
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
  state: EditorStateMigratedV7 & PersistedState,
): EditorStateMigratedV8 & PersistedState {
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
  }) as EditorStateMigratedV8 & PersistedState;
}

/** @internal */
export function migrateEditorStateV8(
  state: EditorStateMigratedV8 & PersistedState,
): EditorStateMigratedV9 & PersistedState {
  return produce(state, (draft) => {
    // Don't need to also loop over deletedModComponentFormStatesByModId, because there can't be any standalone
    // mod components in there. (Standalone mods when deleted are removed from the editor state entirely.)
    for (const formState of draft.modComponentFormStates) {
      (formState as BaseFormStateV6).modMetadata ??=
        createNewUnsavedModMetadata({
          modName: formState.label,
        });
    }
  }) as EditorStateMigratedV9 & PersistedState;
}

/** @internal */
export function migrateEditorStateV9(
  state: EditorStateMigratedV9 & PersistedState,
): EditorStateMigratedV10 & PersistedState {
  return produce(
    state as unknown as EditorStateMigratedV10 & PersistedState,
    (draft) => {
      // Alias the old draft type for deleting old properties
      const oldDraft = draft as unknown as Draft<
        SetOptional<EditorStateMigratedV9, "dirtyModOptionsById">
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
  state: EditorStateMigratedV10 & PersistedState,
): EditorStateMigratedV11 & PersistedState {
  return produce(
    state as unknown as EditorStateMigratedV11 & PersistedState,
    (draft) => {
      // Alias the old draft type for deleting old properties
      const oldDraft = draft as unknown as Draft<
        SetOptional<
          EditorStateMigratedV10,
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

/** @internal */
export function migrateEditorStateV11(
  state: EditorStateMigratedV11 & PersistedState,
): EditorStateMigratedV12 & EditorStateSynced & PersistedState {
  const {
    dirty,
    dirtyModVariablesDefinitionById,
    isDimensionsWarningDismissed,
    dirtyModMetadataById,
    dirtyModOptionsDefinitionById,
    dirtyModOptionsArgsById,
    modComponentFormStates,
    deletedModComponentFormStateIdsByModId,
    _persist,
  } = state;

  return {
    ...initialSyncedState,
    dirty,
    dirtyModVariablesDefinitionById,
    isDimensionsWarningDismissed,
    dirtyModMetadataById,
    dirtyModOptionsArgsById,
    modComponentFormStates,
    deletedModComponentFormStateIdsByModId,
    dirtyModOptionsDefinitionById,
    _persist,
  };
}
