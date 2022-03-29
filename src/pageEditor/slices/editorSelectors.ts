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
import { uniqBy } from "lodash";

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
  (state: RootState) => state,
  (activeElementId, state) =>
    // eslint-disable-next-line security/detect-object-injection -- using an internally-looked-up uuid
    state.editor.showV3UpgradeMessageByElement[activeElementId] ?? false
);

export const selectDirty = (state: RootState) => state.editor.dirty;

export const selectDirtyRecipeOptions = (state: RootState) =>
  state.editor.dirtyRecipeOptionsById;

export const selectDirtyOptionsForRecipeId = createSelector(
  selectDirtyRecipeOptions,
  // eslint-disable-next-line security/detect-object-injection
  (dirtyRecipeOptionsById) => (recipeId: RegistryId) =>
    dirtyRecipeOptionsById[recipeId]
);

export const selectDirtyRecipeMetadata = (state: RootState) =>
  state.editor.dirtyRecipeMetadataById;

export const selectDirtyMetadataForRecipeId = createSelector(
  selectDirtyRecipeMetadata,
  // eslint-disable-next-line security/detect-object-injection
  (dirtyRecipeMetadataById) => (recipeId: RegistryId) =>
    dirtyRecipeMetadataById[recipeId]
);

export function getIdForElement(element: IExtension | FormState): UUID {
  return isExtension(element) ? element.id : element.uuid;
}

export const selectRecipeIsDirty = createSelector(
  selectDirty,
  selectDirtyOptionsForRecipeId,
  selectDirtyMetadataForRecipeId,
  (dirtyElements, getDirtyOptionsById, getDirtyMetadataById) =>
    (
      recipeId: RegistryId,
      extensionsAndElements: Array<IExtension | FormState>
    ) => {
      const elementIds = extensionsAndElements.map((item) =>
        getIdForElement(item)
      );
      const hasDirtyElements = elementIds.some(
        // eslint-disable-next-line security/detect-object-injection -- id extracted from element
        (elementId) => dirtyElements[elementId]
      );
      return (
        hasDirtyElements ||
        Boolean(getDirtyOptionsById(recipeId)) ||
        Boolean(getDirtyMetadataById(recipeId))
      );
    }
);

export const selectIsAddToRecipeModalVisible = (state: RootState) =>
  state.editor.isAddToRecipeModalVisible;

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
