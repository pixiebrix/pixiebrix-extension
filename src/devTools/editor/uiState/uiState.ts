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

import { RootState } from "@/devTools/store";
import {
  FOUNDATION_NODE_ID,
  NodeId,
} from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";

export interface ElementUIState {
  /**
   * The instanceId of the active node in the editor,
   *  or:
   *  @see FOUNDATION_NODE_ID
   */
  activeNodeId: NodeId;

  /**
   * UI state of foundation and blocks in the extension pipeline
   */
  nodeUIStates: Record<NodeId, NodeUIState>;
}

export interface NodeUIState {
  /**
   * Identifier for the node in the editor, either the foundation or a block uuid
   */
  nodeId: NodeId;

  dataPanel: {
    /**
     * Which tab is active in the data panel of the editor UI
     */
    activeTabKey: string | null;

    /**
     * Data tab search filter query, indexed by tabKey
     */
    tabQueries: Record<string, string>;
  };
}

export function makeInitialNodeUIState(nodeId: NodeId): NodeUIState {
  return {
    nodeId,
    dataPanel: {
      activeTabKey: null,
      tabQueries: {},
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
  return rootState.editor.elementUIStates[rootState.editor.activeElement];
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

export function selectNodeDataPanelTabSearchQuery(
  rootState: RootState,
  tabKey: string
): string {
  const nodeUIState = selectActiveNodeUIState(rootState);
  // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
  return nodeUIState.dataPanel.tabQueries[tabKey];
}
