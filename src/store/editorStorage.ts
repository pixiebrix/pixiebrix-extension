/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type EditorState } from "@/pageEditor/pageEditorTypes";
import { produce } from "immer";
import {
  removeElement,
  removeRecipeData,
} from "@/pageEditor/slices/editorSliceHelpers";
import {
  readReduxStorage,
  setReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { migrations } from "@/store/editorMigrations";
import { getMaxMigrationsVersion } from "@/store/migratePersistedState";

const STORAGE_KEY = validateReduxStorageKey("persist:editor");

/**
 * Read dynamic elements from local storage (without going through redux-persist)
 *
 * @returns The editor state, if found in storage, otherwise undefined.
 */
export async function getEditorState(): Promise<EditorState | undefined> {
  // eslint-disable-next-line unicorn/no-useless-undefined -- Required by types
  return readReduxStorage(STORAGE_KEY, migrations, undefined);
}

/**
 * Save the editorSlice state. NOP if state is null/undefined.
 * @param state the editorSlice state to save
 */
export async function saveEditorState(
  state: EditorState | undefined,
): Promise<void> {
  if (state == null) {
    return;
  }

  await setReduxStorage(
    STORAGE_KEY,
    state,
    getMaxMigrationsVersion(migrations),
  );
}

/**
 * Remove a list of elements by id from persisted redux storage.
 *
 * Note: this does not trigger a change even in any current redux instances
 * @param elementIds the elements to remove from persisted redux storage
 */
export async function removeDynamicElements(elementIds: UUID[]): Promise<void> {
  const state = await getEditorState();

  // If this is called from a page where the page editor has not been opened yet,
  // then the persisted editor state will be undefined, so we need to check for that
  if (state == null) {
    return;
  }

  const newState = produce(state, (draft) => {
    for (const id of elementIds) {
      removeElement(draft, id);
    }
  });

  await saveEditorState(newState);
}

/**
 * Remove all elements for a given recipe from persisted redux storage.
 *
 * Note: this does not trigger a change even in any current redux instances
 * @param recipeId The recipe to remove
 * @returns The UUIDs of removed elements
 */
export async function removeDynamicElementsForRecipe(
  recipeId: RegistryId,
): Promise<UUID[]> {
  const removedDynamicElements: UUID[] = [];
  const state = await getEditorState();

  // If this is called from a page where the page editor has not been opened yet,
  // then the persisted editor state will be undefined, so we need to check for that
  if (state == null) {
    return [] as UUID[];
  }

  const newState = produce(state, (draft) => {
    removeRecipeData(draft, recipeId);

    for (const element of state.elements) {
      if (element.recipe?.id === recipeId) {
        removedDynamicElements.push(element.uuid);
        removeElement(draft, element.uuid);
      }
    }
  });

  await saveEditorState(newState);

  return removedDynamicElements;
}
