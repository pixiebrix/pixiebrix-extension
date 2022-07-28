/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { RecipeMetadata, RegistryId, UUID } from "@/core";
import { createSelector } from "reselect";
import {
  EditorRootState,
  ModalKey,
  RootState,
} from "@/pageEditor/pageEditorTypes";
import { selectExtensions } from "@/store/extensionsSelectors";
import { flatMap, isEmpty, uniqBy } from "lodash";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import {
  ElementUIState,
  ErrorMap,
  TabUIState,
} from "@/pageEditor/uiState/uiStateTypes";
import { selectExtensionAnnotations } from "@/analysis/analysisSelectors";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";

export const selectActiveElementId = ({ editor }: EditorRootState) =>
  editor.activeElementId;

export const selectElements = ({ editor }: EditorRootState) => editor.elements;

export const selectActiveElement = createSelector(
  selectActiveElementId,
  selectElements,
  (activeElementId, elements) =>
    elements.find((x) => x.uuid === activeElementId)
);

export const selectActiveRecipeId = ({ editor }: EditorRootState) =>
  editor.activeRecipeId;

export const selectShowV3UpgradeMessageForActiveElement = createSelector(
  selectActiveElementId,
  ({ editor }: EditorRootState) => editor.showV3UpgradeMessageByElement,
  (activeElementId, showV3UpgradeMessageByElement) =>
    // eslint-disable-next-line security/detect-object-injection -- using an internally-looked-up uuid
    showV3UpgradeMessageByElement[activeElementId] ?? false
);

export const selectDirty = ({ editor }: EditorRootState) => editor.dirty;

export const selectDirtyRecipeOptions = ({ editor }: EditorRootState) =>
  editor.dirtyRecipeOptionsById;

const dirtyOptionsForRecipeIdSelector = createSelector(
  selectDirtyRecipeOptions,
  (state: EditorRootState, recipeId: RegistryId) => recipeId,
  (dirtyRecipeOptionsById, recipeId) =>
    // eslint-disable-next-line security/detect-object-injection
    dirtyRecipeOptionsById[recipeId]
);

export const selectDirtyOptionsForRecipeId =
  (recipeId: RegistryId) => (state: RootState) =>
    dirtyOptionsForRecipeIdSelector(state, recipeId);

export const selectDirtyRecipeMetadata = ({ editor }: EditorRootState) =>
  editor.dirtyRecipeMetadataById;

const dirtyMetadataForRecipeIdSelector = createSelector(
  selectDirtyRecipeMetadata,
  (state: EditorRootState, recipeId: RegistryId) => recipeId,
  (dirtyRecipeMetadataById, recipeId) =>
    // eslint-disable-next-line security/detect-object-injection
    dirtyRecipeMetadataById[recipeId]
);

export const selectDirtyMetadataForRecipeId =
  (recipeId: RegistryId) => (state: RootState) =>
    dirtyMetadataForRecipeIdSelector(state, recipeId);

export const selectDeletedElements = ({ editor }: EditorRootState) =>
  editor.deletedElementsByRecipeId;

export const selectAllDeletedElementIds = ({ editor }: EditorRootState) =>
  new Set(
    flatMap(editor.deletedElementsByRecipeId).map((formState) => formState.uuid)
  );

const elementIsDirtySelector = createSelector(
  selectDirty,
  (state: RootState, elementId: UUID) => elementId,
  // eslint-disable-next-line security/detect-object-injection
  (dirty, elementId) => dirty[elementId] ?? false
);

export const selectElementIsDirty = (elementId: UUID) => (state: RootState) =>
  elementIsDirtySelector(state, elementId);

const recipeIsDirtySelector = createSelector(
  selectDirty,
  dirtyOptionsForRecipeIdSelector,
  dirtyMetadataForRecipeIdSelector,
  (state: EditorRootState, recipeId: RegistryId) =>
    // eslint-disable-next-line security/detect-object-injection
    selectDeletedElements(state)[recipeId],
  ({ editor }: EditorRootState, recipeId: RegistryId) =>
    editor.elements
      .filter((element) => element.recipe?.id === recipeId)
      .map((element) => element.uuid),
  (
    dirtyElements,
    dirtyRecipeOptions,
    dirtyRecipeMetadata,
    deletedElements,
    elementIds
    // eslint-disable-next-line max-params
  ) => {
    const hasDirtyElements = elementIds.some(
      // eslint-disable-next-line security/detect-object-injection -- id extracted from element
      (elementId) => dirtyElements[elementId]
    );
    return (
      hasDirtyElements ||
      Boolean(dirtyRecipeOptions) ||
      Boolean(dirtyRecipeMetadata) ||
      !isEmpty(deletedElements)
    );
  }
);

export const selectRecipeIsDirty =
  (recipeId?: RegistryId) => (state: EditorRootState) =>
    Boolean(recipeId) && recipeIsDirtySelector(state, recipeId);

export const selectIsAddToRecipeModalVisible = ({ editor }: EditorRootState) =>
  editor.visibleModalKey === ModalKey.ADD_TO_RECIPE;

export const selectIsAddBlockModalVisible = ({ editor }: EditorRootState) =>
  editor.visibleModalKey === ModalKey.ADD_BLOCK;

export const selectEditorModalVisibilities = ({ editor }: EditorRootState) => ({
  isAddToRecipeModalVisible: editor.visibleModalKey === ModalKey.ADD_TO_RECIPE,
  isRemoveFromRecipeModalVisible:
    editor.visibleModalKey === ModalKey.REMOVE_FROM_RECIPE,
  isSaveAsNewRecipeModalVisible:
    editor.visibleModalKey === ModalKey.SAVE_AS_NEW_RECIPE,
  isCreateRecipeModalVisible: editor.visibleModalKey === ModalKey.CREATE_RECIPE,
  isAddBlockModalVisible: editor.visibleModalKey === ModalKey.ADD_BLOCK,
});

export const selectInstalledRecipeMetadatas = createSelector(
  selectElements,
  selectExtensions,
  (elements, extensions) => {
    const elementRecipes: RecipeMetadata[] = elements
      .filter((element) => Boolean(element.recipe))
      .map((element) => element.recipe);
    const extensionRecipes: RecipeMetadata[] = extensions
      .filter((extension) => Boolean(extension._recipe))
      .map((extension) => extension._recipe);

    return uniqBy(
      [...elementRecipes, ...extensionRecipes],
      (recipe) => recipe.id
    );
  }
);

export const selectSelectionSeq = ({ editor }: EditorRootState) =>
  editor.selectionSeq;

export const selectNewRecipeIds = ({ editor }: EditorRootState) =>
  editor.newRecipeIds;

export const selectKeepLocalCopyOnCreateRecipe = ({
  editor,
}: EditorRootState) => editor.keepLocalCopyOnCreateRecipe;

export const selectExpandedRecipeId = ({ editor }: EditorRootState) =>
  editor.expandedRecipeId;

// UI state
export function selectActiveElementUIState({
  editor,
}: EditorRootState): ElementUIState {
  return editor.elementUIStates[editor.activeElementId];
}

export const selectActiveNodeUIState = createSelector(
  selectActiveElementUIState,
  (elementUIState) => elementUIState.nodeUIStates[elementUIState.activeNodeId]
);

export const selectActiveNodeId = createSelector(
  selectActiveElementUIState,
  (elementUIState) => elementUIState.activeNodeId
);

export const selectPipelineMap = createSelector(
  selectActiveElementUIState,
  (uiState: ElementUIState) => uiState?.pipelineMap
);

export const selectActiveNodeInfo = createSelector(
  selectActiveElementUIState,
  selectActiveNodeId,
  (uiState: ElementUIState, activeNodeId: UUID) =>
    uiState.pipelineMap[activeNodeId]
);

export const selectActiveNode = createSelector(
  selectActiveNodeInfo,
  (nodeInfo) => nodeInfo.blockConfig
);

export const selectNodeDataPanelTabSelected: (
  rootState: EditorRootState
) => DataPanelTabKey = createSelector(
  selectActiveNodeUIState,
  (nodeUIState) => nodeUIState.dataPanel.activeTabKey
);

export function selectNodeDataPanelTabState(
  rootState: EditorRootState,
  tabKey: DataPanelTabKey
): TabUIState {
  const nodeUIState = selectActiveNodeUIState(rootState);
  // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
  return nodeUIState.dataPanel[tabKey];
}

/**
 * Selects the activeElement of the Document or Form builder on the Preview tab
 */
export function selectNodePreviewActiveElement(state: EditorRootState): string {
  return selectNodeDataPanelTabState(state, DataPanelTabKey.Preview)
    .activeElement;
}

export const selectErrorMap = createSelector(
  selectActiveElementUIState,
  (uiState: ElementUIState) => uiState.errorMap
);

export const selectActiveNodeError = createSelector(
  selectErrorMap,
  selectActiveNodeId,
  // eslint-disable-next-line security/detect-object-injection -- activeNodeId is supposed to be UUID, not from user input
  (errorMap: ErrorMap, activeNodeId: UUID) => errorMap[activeNodeId]
);

export const selectAddBlockLocation = ({ editor }: RootState) =>
  editor.addBlockLocation;

const selectAnnotationsForPathSelector = createSelector(
  [
    (state: RootState) => {
      const activeElementId = selectActiveElementId(state);
      return selectExtensionAnnotations(activeElementId)(state);
    },
    (state, path: string) => path,
  ],
  (extensionAnnotations, path) => {
    const relativeBlockPath = path.startsWith(PIPELINE_BLOCKS_FIELD_NAME)
      ? path.slice(PIPELINE_BLOCKS_FIELD_NAME.length + 1)
      : path;

    const pathAnnotations = extensionAnnotations.filter(
      (x) => x.position.path === relativeBlockPath
    );

    return pathAnnotations;
  }
);

/**
 * Selects the annotations for the given path
 * @param path A path relative to the root of the extension or root pipeline
 */
export const selectAnnotationsForPath = (path: string) => (state: RootState) =>
  selectAnnotationsForPathSelector(state, path);
