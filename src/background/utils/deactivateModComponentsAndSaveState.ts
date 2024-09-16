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

import { removeModComponentForEveryTab } from "@/background/removeModComponentForEveryTab";
import deactivateModComponent from "@/background/utils/deactivateModComponent";
import saveModComponentStateAndReloadTabs from "@/background/utils/saveModComponentStateAndReloadTabs";
import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { saveEditorState } from "@/store/editorStorage";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";
import { type SerializedModComponent } from "@/types/modComponentTypes";
import { allSettled } from "@/utils/promiseUtils";

async function deactivateModComponentsAndSaveState(
  modComponentsToDeactivate: SerializedModComponent[],
  {
    modComponentState,
    editorState,
  }: {
    modComponentState: ModComponentState;
    editorState: EditorState | undefined;
  },
): Promise<void> {
  let _modComponentState = modComponentState;
  let _editorState = editorState;

  // Deactivate existing mod components
  for (const modComponent of modComponentsToDeactivate) {
    const result = deactivateModComponent(modComponent.id, {
      modComponentState: _modComponentState,
      editorState: _editorState,
    });
    _modComponentState = result.modComponentState;
    _editorState = result.editorState;
  }

  await allSettled(
    modComponentsToDeactivate.map(async ({ id }) =>
      removeModComponentForEveryTab(id),
    ),
    { catch: "ignore" },
  );

  await saveModComponentStateAndReloadTabs(_modComponentState, {
    // Always queue deactivation to not interfere with running mods
    reloadMode: "queue",
  });
  await saveEditorState(_editorState);
}

export default deactivateModComponentsAndSaveState;
