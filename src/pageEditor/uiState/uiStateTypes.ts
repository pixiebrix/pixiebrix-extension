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

import { TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { NodeId } from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { DataPanelTabKey } from "../tabs/editTab/dataPanel/dataPanelTypes";

export type TabUIState = {
  query: string | null;
  treeExpandedState: TreeExpandedState;
};

export type NodeUIState = {
  /**
   * Identifier for the node in the editor, either the foundation or a block uuid
   */
  nodeId: NodeId;

  dataPanel: {
    /**
     * Which tab is active in the data panel of the editor UI
     */
    activeTabKey: string | null;

    tabStates: Record<DataPanelTabKey, TabUIState>;

    /**
     * Data tab search filter query, indexed by tabKey
     */
    tabQueries: Record<string, string>;

    tabTreeExpandedState: Record<string, TreeExpandedState>;
  };
};

export type ElementUIState = {
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
};
