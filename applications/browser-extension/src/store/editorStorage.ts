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
import { type EditorState } from "../pageEditor/store/editor/pageEditorTypes";
import {
  readReduxStorage,
  setReduxStorage,
  validateReduxStorageKey,
} from "../utils/storageUtils";
import { migrations } from "./editorMigrations";
import { getMaxMigrationsVersion } from "./migratePersistedState";
import { selectModComponentFormStates } from "../pageEditor/store/editor/editorSelectors";
import { editorSlice } from "../pageEditor/store/editor/editorSlice";
import { assertEditorInvariants } from "../pageEditor/store/editor/editorInvariantMiddleware";

const STORAGE_KEY = validateReduxStorageKey("persist:editor");

// eslint-disable-next-line prefer-destructuring -- process.env substitution
const DEBUG = process.env.DEBUG;

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

  if (DEBUG) {
    assertEditorInvariants({ editor: state });
  }

  await setReduxStorage(
    STORAGE_KEY,
    state,
    getMaxMigrationsVersion(migrations),
  );
}

/**
 * Remove all mod components for a given mod from persisted Page Editor Redux storage.
 *
 * NOTE: this does not trigger a change event in any current redux instances because no actions are dispatched.
 *
 * In the Page Editor, use useDeactivateMod instead.
 *
 * @param modId The mod to remove
 * @returns the UUIDs of removed mod components. Does NOT include 1) mod components from the activated mod instance
 * without an associated Page Editor form state, 2) deleted draft mod components
 * @see useDeactivateMod
 */
export async function removeDraftModComponentsByModId(
  modId: RegistryId,
): Promise<UUID[]> {
  const editorState = await getEditorState();

  // If this is called from a page where the Page Editor has not been opened yet,
  // then the persisted editor state will be undefined, so we need to check for that
  if (editorState == null) {
    return [];
  }

  // This method returns the removed mod component UUIDs so that it's in 1 atomic operation with the state update.
  // Otherwise, the set of draft mod ids might change between getEditorState calls.
  const modComponentFormStates = selectModComponentFormStates({
    editor: editorState,
  });
  const draftModComponentIds = modComponentFormStates
    .filter((x) => x.modMetadata.id === modId)
    .map((x) => x.uuid);

  await saveEditorState(
    editorSlice.reducer(editorState, editorSlice.actions.removeModById(modId)),
  );

  return draftModComponentIds;
}
