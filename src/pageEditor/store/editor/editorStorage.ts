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

import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { produce } from "immer";
import {
  readReduxStorage,
  setReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { migrations } from "@/pageEditor/store/editor/editorMigrations";
import { getMaxMigrationsVersion } from "@/store/migratePersistedState";
import { removeModComponentFormState } from "@/pageEditor/store/editor/editorSliceHelpers/removeModComponentFormState";
import { removeModData } from "@/pageEditor/store/editor/editorSliceHelpers/removeModData";

const STORAGE_KEY = validateReduxStorageKey("persist:editor");

/**
 * Read draft mod components from local storage (without going through redux-persist)
 *
 * @returns The editor state, if found in storage, otherwise undefined.
 */
export async function getEditorState(): Promise<EditorState | undefined> {
  return readReduxStorage<EditorState | undefined>(
    STORAGE_KEY,
    migrations,
    // eslint-disable-next-line unicorn/no-useless-undefined -- Required by types
    undefined,
  );
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
 * Remove a list of mod components by id from persisted redux storage.
 *
 * Note: this does not trigger a change even in any current redux instances
 * @param modComponentIds the mod components to remove from persisted redux storage
 */
export async function removeDraftModComponents(
  modComponentIds: UUID[],
): Promise<void> {
  const state = await getEditorState();

  // If this is called from a page where the page editor has not been opened yet,
  // then the persisted editor state will be undefined, so we need to check for that
  if (state == null) {
    return;
  }

  const newState = produce(state, (draft) => {
    for (const id of modComponentIds) {
      removeModComponentFormState(draft, id);
    }
  });

  await saveEditorState(newState);
}

/**
 * Remove all mod components for a given mod from persisted redux storage.
 *
 * Note: this does not trigger a change even in any current redux instances
 * @param modId The mod to remove
 * @returns The UUIDs of removed mod components
 */
export async function removeDraftModComponentsForMod(
  modId: RegistryId,
): Promise<UUID[]> {
  const removedDraftModComponents: UUID[] = [];
  const state = await getEditorState();

  // If this is called from a page where the page editor has not been opened yet,
  // then the persisted editor state will be undefined, so we need to check for that
  if (state == null) {
    return [] as UUID[];
  }

  const newState = produce(state, (draft) => {
    removeModData(draft, modId);

    for (const modComponentFormState of state.modComponentFormStates) {
      if (modComponentFormState.modMetadata?.id === modId) {
        removedDraftModComponents.push(modComponentFormState.uuid);
        removeModComponentFormState(draft, modComponentFormState.uuid);
      }
    }
  });

  await saveEditorState(newState);

  return removedDraftModComponents;
}
