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
import type { Nullishable } from "@/utils/nullishUtils";
import type { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { createSelector } from "@reduxjs/toolkit";
import type { DataPanelTabUIState } from "@/pageEditor/store/editor/uiStateTypes";
import { selectActiveBrickConfigurationUIState } from "@/pageEditor/store/editor/editorSelectors/editorPipelineSelectors";

export const selectIsDataPanelExpanded = ({ editor }: EditorRootState) =>
  editor.isDataPanelExpanded;

/**
 * Select the active Data Panel tab key.
 */
export const selectNodeDataPanelTabSelected: (
  rootState: EditorRootState,
) => Nullishable<DataPanelTabKey> = createSelector(
  selectActiveBrickConfigurationUIState,
  (brickConfigurationUIState) =>
    brickConfigurationUIState?.dataPanel.activeTabKey,
);

/**
 * Select the state of a specific Data Panel tab.
 */
export function selectNodeDataPanelTabState(
  rootState: EditorRootState,
  tabKey: DataPanelTabKey,
): Nullishable<DataPanelTabUIState> {
  const brickConfigurationUIState =
    selectActiveBrickConfigurationUIState(rootState);
  // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
  return brickConfigurationUIState?.dataPanel[tabKey];
}
