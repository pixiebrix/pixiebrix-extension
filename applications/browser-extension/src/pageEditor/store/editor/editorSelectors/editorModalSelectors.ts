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
  type ModalDefinition,
  ModalKey,
} from "@/pageEditor/store/editor/pageEditorTypes";
import type { Selector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";

export const selectEditorModalVisibilities = createSelector(
  ({ editor }: EditorRootState) => editor.visibleModal,
  (visibleModal) => {
    const { type } = visibleModal ?? {};

    return {
      isMoveCopyToModVisible: type === ModalKey.MOVE_COPY_TO_MOD,
      isSaveAsNewModModalVisible: type === ModalKey.SAVE_AS_NEW_MOD,
      isCreateModModalVisible: type === ModalKey.CREATE_MOD,
      isSaveModVersionModalVisible: type === ModalKey.SAVE_MOD_VERSION,
      isAddBlockModalVisible: type === ModalKey.ADD_BRICK,
      isSaveDataIntegrityErrorModalVisible:
        type === ModalKey.SAVE_DATA_INTEGRITY_ERROR,
    };
  },
);

// Typescript-Fu for getModalDataSelector
type ModalDataMap = {
  [K in ModalDefinition["type"]]: Extract<ModalDefinition, { type: K }>["data"];
};

/**
 * Returns a selector to get the data for the currently visible modal
 * @throws Error if the specified modal is not visible
 */
export function getModalDataSelector<T extends ModalKey>(
  modalKey: T,
): Selector<EditorRootState, ModalDataMap[T] | undefined> {
  return ({ editor }: EditorRootState) => {
    const { visibleModal } = editor;
    if (visibleModal?.type !== modalKey) {
      // Ideally this selector would throw, but the modals are written in a way that the selector is always called
      return;
    }

    return visibleModal.data as ModalDataMap[T];
  };
}
