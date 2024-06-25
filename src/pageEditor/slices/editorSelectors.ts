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

import { createSelector } from "@reduxjs/toolkit";
import {
  type EditorRootState,
  type EditorState,
  ModalKey,
  type RootState,
} from "@/pageEditor/pageEditorTypes";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { compact, flatMap, isEmpty, sortBy, uniqBy } from "lodash";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import {
  type BrickPipelineUIState,
  type TabUIState,
} from "@/pageEditor/uiState/uiStateTypes";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { deserializeError } from "serialize-error";
import {
  type ActivatedModComponent,
  type ModComponentBase,
} from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { AnnotationType } from "@/types/annotationTypes";
import { selectKnownEventNames } from "@/analysis/analysisSelectors";
import { normalizeModOptionsDefinition } from "@/utils/modUtils";
import { type AnalysisRootState } from "@/analysis/analysisTypes";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";

export const selectActiveModComponentId = ({ editor }: EditorRootState) => {
  if (editor == null) {
    console.warn(
      "selectActiveModComponentId called without editor redux slice",
    );
    return null;
  }

  return editor.activeModComponentId;
};

export const selectModComponentFormStates = ({
  editor,
}: EditorRootState): EditorState["modComponentFormStates"] =>
  editor.modComponentFormStates;

export const selectActiveModComponentFormState = createSelector(
  selectActiveModComponentId,
  selectModComponentFormStates,
  (
    activeModComponentId,
    formStates,
  ): Nullishable<EditorState["modComponentFormStates"][number]> =>
    formStates.find((x) => x.uuid === activeModComponentId),
);

export const selectActiveModId = ({ editor }: EditorRootState) =>
  editor.activeModId;

export const selectIsInsertingNewStarterBrick = ({ editor }: EditorRootState) =>
  editor.inserting;

export const selectErrorState = ({ editor }: EditorRootState) => ({
  isBetaError: editor.error && editor.beta,
  editorError: editor.error ? deserializeError(editor.error) : null,
});

export const selectIsModComponentDirtyById = ({ editor }: EditorRootState) =>
  editor.dirty;

export const selectDeletedComponentFormStatesByModId = ({
  editor,
}: EditorRootState) => editor.deletedModComponentFormStatesByModId;

export const selectGetDeletedComponentIdsForMod =
  ({ editor }: EditorRootState) =>
  (modId: RegistryId) =>
    // eslint-disable-next-line security/detect-object-injection -- RegistryId
    (editor.deletedModComponentFormStatesByModId[modId] ?? []).map(
      (formState) => formState.uuid,
    );

const selectAllDeletedModComponentIds = ({ editor }: EditorRootState) =>
  new Set(
    flatMap(editor.deletedModComponentFormStatesByModId).map(
      (formState) => formState.uuid,
    ),
  );

export const selectNotDeletedModComponentFormStates: ({
  editor,
}: EditorRootState) => ModComponentFormState[] = createSelector(
  selectModComponentFormStates,
  selectAllDeletedModComponentIds,
  (elements, deletedElementIds) =>
    elements.filter(({ uuid }) => !deletedElementIds.has(uuid)),
);

export const selectNotDeletedActivatedModComponents: ({
  options,
}: ModComponentsRootState) => ActivatedModComponent[] = createSelector(
  selectActivatedModComponents,
  selectAllDeletedModComponentIds,
  (extensions, deletedElementIds) =>
    extensions.filter(({ id }) => !deletedElementIds.has(id)),
);

export const selectDirtyModOptionsDefinitions = ({ editor }: EditorRootState) =>
  editor.dirtyModOptionsById;

const dirtyOptionsDefinitionsForModIdSelector = createSelector(
  selectDirtyModOptionsDefinitions,
  (_state: EditorRootState, recipeId: RegistryId) => recipeId,
  (dirtyOptionsDefinitionsByModId, modId) => {
    // eslint-disable-next-line security/detect-object-injection -- RegistryId for recipe
    const options = dirtyOptionsDefinitionsByModId[modId];

    if (options) {
      // Provide a consistent shape of the options
      return normalizeModOptionsDefinition(options);
    }

    // Return undefined if the options aren't dirty. Returning nullish instead of a default empty options allows the
    // caller to distinguish no dirty options vs. options that have been reverted to the default.
  },
);

export const selectDirtyOptionsDefinitionsForModId =
  (modId: RegistryId) => (state: EditorRootState) =>
    dirtyOptionsDefinitionsForModIdSelector(state, modId);

const dirtyOptionValuesForModIdSelector = createSelector(
  selectNotDeletedModComponentFormStates,
  (_state: EditorRootState, modId: RegistryId) => modId,
  (formStates, recipeId) =>
    formStates.find((formState) => formState.recipe?.id === recipeId)
      ?.optionsArgs,
);

export const selectDirtyOptionValuesForModId =
  (modId: RegistryId) => (state: EditorRootState) =>
    dirtyOptionValuesForModIdSelector(state, modId);

export const selectDirtyModMetadata = ({ editor }: EditorRootState) =>
  editor.dirtyModMetadataById;

const dirtyMetadataForModIdSelector = createSelector(
  selectDirtyModMetadata,
  (_state: EditorRootState, modId: RegistryId) => modId,
  (dirtyModMetadataById, modId) =>
    // eslint-disable-next-line security/detect-object-injection -- modId is a controlled string
    dirtyModMetadataById[modId],
);

export const selectDirtyMetadataForModId =
  (modId: RegistryId) => (state: EditorRootState) =>
    dirtyMetadataForModIdSelector(state, modId);

const modComponentIsDirtySelector = createSelector(
  selectIsModComponentDirtyById,
  (_state: RootState, modComponentId: UUID) => modComponentId,
  (isModComponentDirtyById, modComponentId) =>
    // eslint-disable-next-line security/detect-object-injection -- UUID
    isModComponentDirtyById[modComponentId] ?? false,
);

export const selectModComponentIsDirty =
  (modComponentId: UUID) => (state: RootState) =>
    modComponentIsDirtySelector(state, modComponentId);

const modIsDirtySelector = createSelector(
  selectIsModComponentDirtyById,
  dirtyOptionsDefinitionsForModIdSelector,
  dirtyMetadataForModIdSelector,
  (state: EditorRootState, modId: RegistryId) =>
    // eslint-disable-next-line security/detect-object-injection -- RegistryId is a controlled string
    selectDeletedComponentFormStatesByModId(state)[modId],
  ({ editor }: EditorRootState, modId: RegistryId) =>
    editor.modComponentFormStates
      .filter((formState) => formState.recipe?.id === modId)
      .map((formState) => formState.uuid),
  (
    isModComponentDirtyById,
    dirtyModOptions,
    dirtyModMetadata,
    deletedModComponentFormStates,
    modComponentFormStateIds,
    // eslint-disable-next-line max-params -- all are needed
  ) => {
    const hasDirtyComponentFormStates = modComponentFormStateIds.some(
      // eslint-disable-next-line security/detect-object-injection -- UUID
      (modComponentId) => isModComponentDirtyById[modComponentId],
    );
    return (
      hasDirtyComponentFormStates ||
      Boolean(dirtyModOptions) ||
      Boolean(dirtyModMetadata) ||
      !isEmpty(deletedModComponentFormStates)
    );
  },
);

export const selectModIsDirty =
  (modId?: RegistryId) => (state: EditorRootState) =>
    Boolean(modId && modIsDirtySelector(state, modId));

export const selectEditorModalVisibilities = ({ editor }: EditorRootState) => ({
  isAddToModModalVisible: editor.visibleModalKey === ModalKey.ADD_TO_MOD,
  isRemoveFromModModalVisible:
    editor.visibleModalKey === ModalKey.REMOVE_FROM_MOD,
  isSaveAsNewModModalVisible:
    editor.visibleModalKey === ModalKey.SAVE_AS_NEW_MOD,
  isCreateModModalVisible: editor.visibleModalKey === ModalKey.CREATE_MOD,
  isAddBlockModalVisible: editor.visibleModalKey === ModalKey.ADD_BRICK,
  isSaveDataIntegrityErrorModalVisible:
    editor.visibleModalKey === ModalKey.SAVE_DATA_INTEGRITY_ERROR,
});

export const selectInstalledModMetadatas = createSelector(
  selectModComponentFormStates,
  selectActivatedModComponents,
  (formStates, activatedModComponents) => {
    const formStateModMetadatas: Array<ModComponentBase["_recipe"]> = formStates
      .filter((formState) => Boolean(formState.recipe))
      .map((formState) => formState.recipe);
    const activatedModComponentModMetadatas: Array<
      ModComponentBase["_recipe"]
    > = activatedModComponents
      .filter((component) => Boolean(component._recipe))
      .map((component) => component._recipe);

    return compact(
      uniqBy(
        [...formStateModMetadatas, ...activatedModComponentModMetadatas],
        (modMetadata) => modMetadata?.id,
      ),
    );
  },
);

export const selectEditorUpdateKey = ({ editor }: EditorRootState) =>
  editor.selectionSeq;

export const selectIsEditorSidebarExpanded = ({ editor }: EditorRootState) =>
  editor.isModListExpanded;

export const selectIsDataPanelExpanded = ({ editor }: EditorRootState) =>
  editor.isDataPanelExpanded;

export const selectKeepLocalCopyOnCreateMod = ({ editor }: EditorRootState) =>
  editor.keepLocalCopyOnCreateMod;

export const selectExpandedModId = ({ editor }: EditorRootState) =>
  editor.expandedModId;

// UI state
export function selectActiveModComponentUIState({
  editor,
}: EditorRootState): Nullishable<BrickPipelineUIState> {
  if (editor.activeModComponentId == null) {
    console.warn(
      "selectActiveModComponentUIState called without activeModComponentId",
    );
    return null;
  }

  return editor.brickPipelineUIStateById[editor.activeModComponentId];
}

export const selectActiveNodeUIState = createSelector(
  selectActiveModComponentUIState,
  (elementUIState) => elementUIState?.nodeUIStates[elementUIState.activeNodeId],
);

export const selectActiveNodeId = createSelector(
  selectActiveModComponentUIState,
  (elementUIState) => elementUIState?.activeNodeId,
);

export const selectPipelineMap = createSelector(
  selectActiveModComponentUIState,
  (uiState: BrickPipelineUIState) => uiState?.pipelineMap,
);

export const selectActiveNodeInfo = createSelector(
  selectActiveModComponentUIState,
  selectActiveNodeId,
  (uiState: Nullishable<BrickPipelineUIState>, activeNodeId?: UUID) => {
    assertNotNullish(
      uiState,
      `UI state is ${typeof uiState === "object" ? "null" : "undefined"}`,
    );
    assertNotNullish(activeNodeId, "Active Node ID is undefined");

    // eslint-disable-next-line security/detect-object-injection -- UUID
    const activeNodeInfo = uiState.pipelineMap[activeNodeId];

    assertNotNullish(
      activeNodeInfo,
      `Active Node Info not found for node id: ${activeNodeId}`,
    );

    return activeNodeInfo;
  },
);

export const selectCollapsedNodes = createSelector(
  selectActiveModComponentUIState,
  (elementUIState: BrickPipelineUIState) =>
    Object.entries(elementUIState.nodeUIStates)
      .map(([nodeId, { collapsed }]) => (collapsed ? nodeId : null))
      .filter((nodeId) => nodeId != null),
);

const activeModComponentNodeInfoSelector = createSelector(
  selectActiveModComponentUIState,
  (state: EditorRootState, instanceId: UUID) => instanceId,
  (uiState: BrickPipelineUIState, instanceId: UUID) =>
    // eslint-disable-next-line security/detect-object-injection -- using a node uuid
    uiState.pipelineMap[instanceId],
);

export const selectActiveModComponentNodeInfo =
  (instanceId: UUID) => (state: EditorRootState) =>
    activeModComponentNodeInfoSelector(state, instanceId);

const parentBlockInfoSelector = createSelector(
  selectActiveModComponentUIState,
  (state: EditorRootState, instanceId: UUID) => instanceId,
  (uiState: BrickPipelineUIState, instanceId: UUID) => {
    if (uiState == null) {
      return null;
    }

    // eslint-disable-next-line security/detect-object-injection -- UUID
    const { parentNodeId } = uiState.pipelineMap[instanceId] ?? {};
    if (!parentNodeId) {
      return null;
    }

    // eslint-disable-next-line security/detect-object-injection -- UUID
    return uiState.pipelineMap[parentNodeId];
  },
);

/**
 * Return the block with the pipeline that contains the given node.
 * @param instanceId the block instanceId
 */
export const selectParentBlockInfo =
  (instanceId: UUID) => (state: EditorRootState) =>
    parentBlockInfoSelector(state, instanceId);

export const selectNodeDataPanelTabSelected: (
  rootState: EditorRootState,
) => Nullishable<DataPanelTabKey> = createSelector(
  selectActiveNodeUIState,
  (nodeUIState) => nodeUIState?.dataPanel.activeTabKey,
);

export function selectNodeDataPanelTabState(
  rootState: EditorRootState,
  tabKey: DataPanelTabKey,
): Nullishable<TabUIState> {
  const nodeUIState = selectActiveNodeUIState(rootState);
  // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
  return nodeUIState?.dataPanel[tabKey];
}

/**
 * Selects the activeElement of the Document or Form builder on the Preview tab
 */
export function selectActiveDocumentOrFormPreviewElement(
  state: EditorRootState,
): Nullishable<string> {
  return selectNodeDataPanelTabState(state, DataPanelTabKey.Preview)
    ?.activeElement;
}

export const selectAddBlockLocation = ({ editor }: EditorRootState) =>
  editor.addBrickLocation;

const activeModComponentAnalysisAnnotationsForPath = createSelector(
  selectActiveModComponentId,
  ({ analysis }: AnalysisRootState) => analysis.extensionAnnotations,
  (state: RootState, path?: string) => path,
  ({ editor }: EditorRootState) => editor.isVariablePopoverVisible,
  (activeElementId, annotations, path, isVariablePopoverVisible) => {
    if (activeElementId == null) {
      return [];
    }

    // eslint-disable-next-line security/detect-object-injection -- UUID
    const elementAnnotations = annotations?.[activeElementId] ?? [];

    const filteredAnnotations = elementAnnotations.filter(
      ({ analysisId, position }) =>
        position.path === path &&
        // Hide variable/template annotations while the popover is open because the user is editing the field
        (!isVariablePopoverVisible ||
          !["var", "template"].includes(analysisId)),
    );

    return sortBy(filteredAnnotations, (annotation) => {
      switch (annotation.type) {
        case AnnotationType.Error: {
          return 2;
        }

        case AnnotationType.Warning: {
          return 1;
        }

        default: {
          return 0;
        }
      }
    });
  },
);

/**
 * Selects the analysis annotations for the given path
 * @param path A path relative to the root of the extension or root pipeline
 *
 * @note This should NOT be used outside the page editor, it is tightly coupled with editorSlice
 */
export const selectActiveModComponentAnalysisAnnotationsForPath =
  (path?: string) => (state: RootState) =>
    activeModComponentAnalysisAnnotationsForPath(state, path);

export const selectCopiedBrick = ({ editor }: EditorRootState) =>
  editor.copiedBrick;

export const selectModComponentAvailability = ({
  editor: {
    availableActivatedModComponentIds,
    isPendingAvailableActivatedModComponents,
    availableDraftModComponentIds,
    isPendingDraftModComponents,
  },
}: EditorRootState) => ({
  availableActivatedModComponentIds,
  isPendingAvailableActivatedModComponents,
  availableDraftModComponentIds,
  isPendingDraftModComponents,
});

export const selectKnownEventNamesForActiveModComponent = createSelector(
  selectActiveModComponentId,
  selectKnownEventNames,
  (activeElementId, knownEventNameMap) => {
    if (activeElementId == null) {
      return [];
    }

    // eslint-disable-next-line security/detect-object-injection -- is a UUID
    return knownEventNameMap[activeElementId] ?? [];
  },
);

export const selectIsDimensionsWarningDismissed = (state: EditorRootState) =>
  state.editor.isDimensionsWarningDismissed;
