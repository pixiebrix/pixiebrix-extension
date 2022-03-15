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

import { EditorState, FormState } from "@/pageEditor/slices/editorSlice";
import { IExtension, RegistryId } from "@/core";
import { createSelector } from "reselect";
import { isExtension } from "@/pageEditor/sidebar/common";

type RootState = { editor: EditorState };

export const selectActiveExtensionId = ({ editor }: RootState) =>
  editor.activeElement;

export const selectElements = ({ editor }: RootState) => editor.elements;

export const selectActiveElement = (state: RootState) => {
  const activeElementId = selectActiveExtensionId(state);
  const elements = selectElements(state);
  return elements.find((x) => x.uuid === activeElementId);
};

export const selectActiveRecipeId = ({ editor }: RootState) =>
  editor.activeRecipeId;

export const selectShowV3UpgradeMessageForActiveElement = (
  state: RootState
) => {
  const activeElementId = selectActiveExtensionId(state);
  // eslint-disable-next-line security/detect-object-injection -- using an internally-looked-up uuid
  return state.editor.showV3UpgradeMessageByElement[activeElementId] ?? false;
};

const selectDirty = (state: RootState) => state.editor.dirty;

export const selectDirtyRecipeOptions = (state: RootState) =>
  state.editor.dirtyRecipeOptionsById;

export function getIdForElement(element: IExtension | FormState): string {
  return isExtension(element) ? element.id : element.uuid;
}

export const selectRecipeIsDirty = createSelector(
  [
    selectDirty,
    selectDirtyRecipeOptions,
    (
      state: RootState,
      recipeId: RegistryId,
      elements: Array<IExtension | FormState>
    ) => ({ recipeId, elements }),
  ],
  (dirty, dirtyRecipeOptionsById, { recipeId, elements }) => {
    const hasDirtyElements = elements.some(
      (element) => dirty[getIdForElement(element)]
    );
    const hasDirtyOptions = recipeId in dirtyRecipeOptionsById;
    return hasDirtyElements || hasDirtyOptions;
  }
);
