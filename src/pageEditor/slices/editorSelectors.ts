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
import { EditorState, ModalKey } from "@/pageEditor/pageEditorTypes";
import { selectExtensions } from "@/store/extensionsSelectors";
import { flatMap, isEmpty, uniqBy } from "lodash";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import {
  ElementUIState,
  ErrorMap,
  NodeUIState,
  TabUIState,
} from "@/pageEditor/uiState/uiStateTypes";
import { BlockConfig } from "@/blocks/types";

type RootState = { editor: EditorState };

export const selectActiveElementId = ({ editor }: RootState) =>
  editor.activeElementId;

export const selectElements = ({ editor }: RootState) => editor.elements;

export const selectActiveElement = createSelector(
  selectActiveElementId,
  selectElements,
  (activeElementId, elements) =>
    elements.find((x) => x.uuid === activeElementId)
);

export const selectActiveRecipeId = ({ editor }: RootState) =>
  editor.activeRecipeId;

export const selectShowV3UpgradeMessageForActiveElement = createSelector(
  selectActiveElementId,
  (state: RootState) => state.editor.showV3UpgradeMessageByElement,
  (activeElementId, showV3UpgradeMessageByElement) =>
    // eslint-disable-next-line security/detect-object-injection -- using an internally-looked-up uuid
    showV3UpgradeMessageByElement[activeElementId] ?? false
);

export const selectDirty = ({ editor }: RootState) => editor.dirty;

export const selectDirtyRecipeOptions = ({ editor }: RootState) =>
  editor.dirtyRecipeOptionsById;

const dirtyOptionsForRecipeIdSelector = createSelector(
  selectDirtyRecipeOptions,
  (state: RootState, recipeId: RegistryId) => recipeId,
  (dirtyRecipeOptionsById, recipeId) =>
    // eslint-disable-next-line security/detect-object-injection
    dirtyRecipeOptionsById[recipeId]
);

export const selectDirtyOptionsForRecipeId =
  (recipeId: RegistryId) => (state: RootState) =>
    dirtyOptionsForRecipeIdSelector(state, recipeId);

export const selectDirtyRecipeMetadata = ({ editor }: RootState) =>
  editor.dirtyRecipeMetadataById;

const dirtyMetadataForRecipeIdSelector = createSelector(
  selectDirtyRecipeMetadata,
  (state: RootState, recipeId: RegistryId) => recipeId,
  (dirtyRecipeMetadataById, recipeId) =>
    // eslint-disable-next-line security/detect-object-injection
    dirtyRecipeMetadataById[recipeId]
);

export const selectDirtyMetadataForRecipeId =
  (recipeId: RegistryId) => (state: RootState) =>
    dirtyMetadataForRecipeIdSelector(state, recipeId);

export const selectDeletedElements = ({ editor }: RootState) =>
  editor.deletedElementsByRecipeId;

export const selectAllDeletedElementIds = ({ editor }: RootState) =>
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
  (state: RootState, recipeId: RegistryId) =>
    // eslint-disable-next-line security/detect-object-injection
    selectDeletedElements(state)[recipeId],
  (state: RootState, recipeId: RegistryId) =>
    state.editor.elements
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
  (recipeId?: RegistryId) => (state: RootState) =>
    Boolean(recipeId) && recipeIsDirtySelector(state, recipeId);

export const selectIsAddToRecipeModalVisible = ({ editor }: RootState) =>
  editor.visibleModalKey === ModalKey.ADD_TO_RECIPE;

export const selectIsAddBlockModalVisible = ({ editor }: RootState) =>
  editor.visibleModalKey === ModalKey.ADD_BLOCK;

export const selectEditorModalVisibilities = ({ editor }: RootState) => ({
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

export const selectSelectionSeq = (state: RootState) =>
  state.editor.selectionSeq;

export const selectNewRecipeIds = (state: RootState) =>
  state.editor.newRecipeIds;

export const selectKeepLocalCopyOnCreateRecipe = (state: RootState) =>
  state.editor.keepLocalCopyOnCreateRecipe;

export const selectExpandedRecipeId = (state: RootState) =>
  state.editor.expandedRecipeId;

// UI state
export function selectActiveElementUIState(
  rootState: RootState
): ElementUIState {
  return rootState.editor.elementUIStates[rootState.editor.activeElementId];
}

export const selectActiveNodeUIState: (rootState: RootState) => NodeUIState =
  createSelector(
    selectActiveElementUIState,
    (elementUIState) => elementUIState.nodeUIStates[elementUIState.activeNodeId]
  );

export const selectActiveNodeId: (rootState: RootState) => UUID =
  createSelector(
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

export const selectActiveNode: (rootState: RootState) => BlockConfig =
  createSelector(selectActiveNodeInfo, (nodeInfo) => nodeInfo.blockConfig);

export const selectNodeDataPanelTabSelected: (
  rootState: RootState
) => DataPanelTabKey = createSelector(
  selectActiveNodeUIState,
  (nodeUIState) => nodeUIState.dataPanel.activeTabKey
);

export function selectNodeDataPanelTabState(
  rootState: RootState,
  tabKey: DataPanelTabKey
): TabUIState {
  const nodeUIState = selectActiveNodeUIState(rootState);
  // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
  return nodeUIState.dataPanel[tabKey];
}

/**
 * Selects the activeElement of the Document or Form builder on the Preview tab
 */
export function selectNodePreviewActiveElement(rootState: RootState): string {
  return selectNodeDataPanelTabState(rootState, DataPanelTabKey.Preview)
    .activeElement;
}

export const selectErrorMap = createSelector(
  selectActiveElementUIState,
  (uiState: ElementUIState) => uiState.errorMap
);

export const selectActiveNodeError = createSelector(
  selectErrorMap,
  selectActiveNodeId,
  (errorMap: ErrorMap, activeNodeId: UUID) => errorMap[activeNodeId]
);

export const selectAddBlockLocation = ({ editor }: RootState) =>
  editor.addBlockLocation;
