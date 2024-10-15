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

import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";
import { type ModInstance } from "@/types/modInstanceTypes";
import { editorSlice } from "@/pageEditor/store/editor/editorSlice";
import modComponentSlice from "@/store/modComponents/modComponentSlice";

type ReduxSliceState = {
  modComponentState: ModComponentState;
  editorState: EditorState | undefined;
};

/**
 * Returns the Redux state that excludes the mod. NOTE: does not persist the state or remove the mod UI from
 * existing tabs.
 *
 * @param modInstance the active mod to deactivate
 * @param reduxState the current state of the modComponent and editor redux stores
 * @returns new redux state with the mod components deactivated
 * and the mod components that were deactivated
 */
function deactivateMod(
  modInstance: ModInstance,
  { editorState, modComponentState }: ReduxSliceState,
): ReduxSliceState {
  const { id: modId } = modInstance.definition.metadata;

  return {
    modComponentState: modComponentSlice.reducer(
      modComponentState,
      modComponentSlice.actions.removeModById(modId),
    ),
    editorState: editorSlice.reducer(
      editorState,
      editorSlice.actions.removeMod(modInstance),
    ),
  };
}

export default deactivateMod;
