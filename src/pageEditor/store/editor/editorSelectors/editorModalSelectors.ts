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

import {
  type EditorRootState,
  ModalKey,
} from "@/pageEditor/store/editor/pageEditorTypes";

export const selectEditorModalVisibilities = ({ editor }: EditorRootState) => ({
  isMoveCopyToModVisible: editor.visibleModalKey === ModalKey.MOVE_COPY_TO_MOD,
  isSaveAsNewModModalVisible:
    editor.visibleModalKey === ModalKey.SAVE_AS_NEW_MOD,
  isCreateModModalVisible: editor.visibleModalKey === ModalKey.CREATE_MOD,
  isAddBlockModalVisible: editor.visibleModalKey === ModalKey.ADD_BRICK,
  isSaveDataIntegrityErrorModalVisible:
    editor.visibleModalKey === ModalKey.SAVE_DATA_INTEGRITY_ERROR,
});

/**
 * Returns true if the visible mod creation modal/wizard should keep a copy of the source mod on save.
 * - True corresponds to copy behavior
 * - False corresponds to move/rename behavior
 */
export const selectKeepLocalCopyOnCreateMod = ({ editor }: EditorRootState) =>
  editor.keepLocalCopyOnCreateMod;
