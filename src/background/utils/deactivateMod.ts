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

import deactivateModComponent from "@/background/utils/deactivateModComponent";
import getModComponentsForMod from "@/mods/util/getModComponentsForMod";
import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";

/**
 * Deactivates all mod components with the given mod id. Does not remove the mod UI from existing tabs.
 *
 * @param modId the mod registry id
 * @param reduxState the current state of the modComponent and editor redux stores
 * @returns new redux state with the mod components deactivated
 * and the mod components that were deactivated
 */
function deactivateMod(
  modId: RegistryId,
  {
    editorState,
    modComponentState,
  }: {
    modComponentState: ModComponentState;
    editorState: EditorState | undefined;
  },
): {
  modComponentState: ModComponentState;
  editorState: EditorState | undefined;
  deactivatedModComponents: ActivatedModComponent[];
} {
  const activatedModComponents = getModComponentsForMod(
    modId,
    modComponentState,
  );
  const deactivatedModComponents: ActivatedModComponent[] = [];

  let _nextModComponentState = modComponentState;
  let _nextEditorState = editorState;

  for (const activatedModComponent of activatedModComponents) {
    const {
      modComponentState: nextModComponentState,
      editorState: nextEditorState,
    } = deactivateModComponent(activatedModComponent.id, {
      modComponentState: _nextModComponentState,
      editorState: _nextEditorState,
    });

    _nextModComponentState = nextModComponentState;
    _nextEditorState = nextEditorState;

    deactivatedModComponents.push(activatedModComponent);
  }

  return {
    modComponentState: _nextModComponentState,
    editorState: _nextEditorState,
    deactivatedModComponents,
  };
}

export default deactivateMod;
