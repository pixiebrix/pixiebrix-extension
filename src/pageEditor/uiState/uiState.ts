/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { NodeId } from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { UUID } from "@/core";
import { RootState } from "@/pageEditor/pageEditorTypes";
import {
  ElementUIState,
  NodeUIState,
  TabUIState,
} from "@/pageEditor/uiState/uiStateTypes";
import { TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";

export const FOUNDATION_NODE_ID = "foundation" as UUID;

export function makeInitialNodeUIState(nodeId: NodeId): NodeUIState {
  return {
    nodeId,
    dataPanel: {
      activeTabKey: null,
      [DataPanelTabKey.Context]: {},
      [DataPanelTabKey.PageState]: {},
      [DataPanelTabKey.Formik]: {},
      [DataPanelTabKey.BlockConfig]: {},
      [DataPanelTabKey.Rendered]: {},
      [DataPanelTabKey.Output]: {},
      [DataPanelTabKey.Preview]: {},
    },
  };
}

export function makeInitialElementUIState(): ElementUIState {
  return {
    activeNodeId: FOUNDATION_NODE_ID,
    nodeUIStates: {
      [FOUNDATION_NODE_ID]: makeInitialNodeUIState(FOUNDATION_NODE_ID),
    },
  };
}

export function selectActiveElementUIState(
  rootState: RootState
): ElementUIState {
  return rootState.editor.elementUIStates[rootState.editor.activeElementId];
}

export function selectActiveNodeUIState(rootState: RootState): NodeUIState {
  const elementUIState = selectActiveElementUIState(rootState);
  return elementUIState.nodeUIStates[elementUIState.activeNodeId];
}

export function selectActiveNodeId(rootState: RootState): NodeId {
  const elementUIState = selectActiveElementUIState(rootState);
  return elementUIState.activeNodeId;
}

export function selectNodeDataPanelTabSelected(rootState: RootState): string {
  const nodeUIState = selectActiveNodeUIState(rootState);
  return nodeUIState.dataPanel.activeTabKey;
}

export function selectNodeDataPanelTabState(
  rootState: RootState,
  tabKey: DataPanelTabKey
): TabUIState {
  const nodeUIState = selectActiveNodeUIState(rootState);
  return nodeUIState.dataPanel[tabKey];
}

export function selectNodeDataPanelTabSearchQuery(
  rootState: RootState,
  tabKey: DataPanelTabKey
): string {
  const nodeUIState = selectActiveNodeUIState(rootState);
  // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
  return nodeUIState.dataPanel[tabKey].query ?? "";
}

export function selectNodeDataPanelTabExpandedState(
  rootState: RootState,
  tabKey: DataPanelTabKey
): TreeExpandedState {
  const nodeUIState = selectActiveNodeUIState(rootState);
  // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
  return nodeUIState.dataPanel[tabKey].treeExpandedState ?? {};
}
