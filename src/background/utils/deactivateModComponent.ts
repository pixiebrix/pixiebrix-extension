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
import { type UUID } from "@/types/stringTypes";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
// eslint-disable-next-line local-rules/noCrossBoundaryImports -- Updating mod components in the background
import { editorSlice } from "@/pageEditor/store/editor/editorSlice";

/**
 * Deactivates the mod component from the modComponent and editor redux stores. Note that while the mod component
 * is removed from redux, it is not removed from existing tabs until a navigation is triggered/store is refreshed in the respective tab.
 * This is to prevent interrupting the user's workflow when performing updates in the background.
 * @param modComponentId the id of the mod component to deactivate
 * @param reduxState the current state of the modComponent and editor redux stores
 * @returns the new redux state with the mod component deactivated
 */
function deactivateModComponent(
  modComponentId: UUID,
  {
    modComponentState,
    editorState,
  }: {
    modComponentState: ModComponentState;
    editorState: EditorState | undefined;
  },
): {
  modComponentState: ModComponentState;
  editorState: EditorState | undefined;
} {
  const nextModComponentState = modComponentSlice.reducer(
    modComponentState,
    modComponentSlice.actions.removeModComponent({ modComponentId }),
  );

  const nextEditorState = editorState
    ? editorSlice.reducer(
        editorState,
        editorSlice.actions.removeModComponentFormState(modComponentId),
      )
    : undefined;

  return {
    modComponentState: nextModComponentState,
    editorState: nextEditorState,
  };
}

export default deactivateModComponent;
