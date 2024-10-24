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

import type { EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";

/**
 * Select a key indicating that a change occurred in the Redux state that's not reflected in
 * Formik. Used to force the Formik mod component form to re-mount with the latest values
 * from Redux.
 *
 * Examples of changes that increment this number:
 * - Changing the selection in the mod listing pane
 * - Copy/pasting a brick
 */
export const selectEditorUpdateKey = ({ editor }: EditorRootState) =>
  editor.selectionSeq;

/**
 * Select the id of the selected mod component id, or nullish if no mod component is selected.
 */
export const selectActiveModComponentId = ({ editor }: EditorRootState) => {
  if (editor == null) {
    console.warn(
      "selectActiveModComponentId called without editor redux slice",
    );
    return null;
  }

  return editor.activeModComponentId;
};

/**
 * Select the id of the mod being edited. NOTE: is null when editing a mod component within the mod.
 * @see selectModId
 * @see selectCurrentModId
 */
export const selectActiveModId = ({ editor }: EditorRootState) =>
  editor.activeModId;

/**
 * Select the id of the "expanded" mod in the accordian layout in the Mod Listing Pane. NOTE: is null if the
 * user has collapsed item for the mod.
 * @see selectActiveModId
 * @see selectModId
 */
export const selectExpandedModId = ({ editor }: EditorRootState) =>
  editor.expandedModId;

export const selectIsEditorSidebarExpanded = ({ editor }: EditorRootState) =>
  editor.isModListExpanded;
