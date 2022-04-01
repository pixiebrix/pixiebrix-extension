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

import { IExtension, RecipeMetadata, RegistryId, UUID } from "@/core";
import { createSelector } from "reselect";
import { isExtension } from "@/pageEditor/sidebar/common";
import { EditorState, FormState } from "@/pageEditor/pageEditorTypes";
import { selectExtensions } from "@/store/extensionsSelectors";
import { isEmpty, uniqBy } from "lodash";

type RootState = { editor: EditorState };

export const selectActiveElementId = ({ editor }: RootState) =>
  editor.activeElement;

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

export const selectDirty = (state: RootState) => state.editor.dirty;

export const selectDirtyRecipeOptions = (state: RootState) =>
  state.editor.dirtyRecipeOptionsById;

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

export const selectDirtyRecipeMetadata = (state: RootState) =>
  state.editor.dirtyRecipeMetadataById;

const dirtyMetadataForRecipeIdSelector = createSelector(
  selectDirtyRecipeMetadata,
  (state: RootState, recipeId: RegistryId) => recipeId,
  (dirtyRecipeMetadataById, recipeId) =>
    // eslint-disable-next-line security/detect-object-injection
    dirtyRecipeMetadataById[recipeId]
);

export const selectDeletedElements = (state: RootState) =>
  state.editor.deletedElementsByRecipeId;

export function getIdForElement(element: IExtension | FormState): UUID {
  return isExtension(element) ? element.id : element.uuid;
}

export function getRecipeIdForElement(
  element: IExtension | FormState
): RegistryId {
  return isExtension(element) ? element._recipe?.id : element.recipe?.id;
}

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

export const selectIsAddToRecipeModalVisible = (state: RootState) =>
  state.editor.isAddToRecipeModalVisible;

export const selectIsRemoveFromRecipeModalVisible = (state: RootState) =>
  state.editor.isRemoveFromRecipeModalVisible;

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
