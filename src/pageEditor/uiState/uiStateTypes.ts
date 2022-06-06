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
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { RegistryId, UUID } from "@/core";
import { BlockConfig, BlockPipeline } from "@/blocks/types";

type PipelineMapBlock = {
  blockId: RegistryId;
  /**
   * The property name path relative to the pipeline root
   */
  path: string;
  blockConfig: BlockConfig;
  /**
   * Index of the block in its pipeline
   */
  index: number;

  /**
   * The path of the pipeline relative to the pipeline root
   */
  pipelinePath: string;

  /**
   * The block's pipeline
   */
  pipeline: BlockPipeline;
};

/**
 * The map of pipeline blocks. The key is the instanceId of the block.
 */
export type PipelineMap = Record<UUID, PipelineMapBlock>;

export type TabUIState = {
  /**
   * The filter query of the JsonTree component
   */
  query: string;

  /**
   * The expanded state of the JsonTree component
   */
  treeExpandedState: TreeExpandedState;

  /**
   * The active element of a Document or Form builder on the Preview tab
   */
  activeElement: string | null;
};

export type NodeUIState = {
  /**
   * Identifier for the node in the editor, either the foundation or a block uuid
   */
  nodeId: NodeId;

  /**
   * UI state of the Tabs in the data panel
   */
  dataPanel: Record<DataPanelTabKey, TabUIState> & {
    /**
     * Which tab is active in the data panel of the editor UI
     */
    activeTabKey: DataPanelTabKey | null;
  };
};

export type ElementUIState = {
  /**
   * Flat map of all pipeline blocks including sub pipelines.
   * Key is the block instanceId.
   */
  pipelineMap: PipelineMap;

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
