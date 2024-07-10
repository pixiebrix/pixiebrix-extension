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

import { type TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { type DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import { type Nullishable } from "@/utils/nullishUtils";

export type NodeInfo = {
  blockId: RegistryId;

  /**
   * The property name path relative to the Formik root
   */
  path: string;

  blockConfig: BrickConfig;

  /**
   * Index of the brick in its pipeline
   */
  index: number;

  /**
   * The path of the pipeline relative to the Formik root
   */
  pipelinePath: string;

  /**
   * The brick's pipeline
   */
  pipeline: BrickPipeline;

  /**
   * Instance id of parent node
   */
  parentNodeId: Nullishable<UUID>;
};

/**
 * The map of pipeline bricks. The key is the instanceId of the brick.
 */
export type PipelineMap = Record<UUID, NodeInfo>;

export type DataPanelTabUIState = {
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

export type BrickConfigurationUIState = {
  /**
   * Identifier for the node in the editor, either the foundation or a brick uuid
   */
  nodeId: UUID;

  /**
   * UI state of the Tabs in the data panel
   */
  dataPanel: Record<DataPanelTabKey, DataPanelTabUIState> & {
    /**
     * Which tab is active in the data panel of the editor UI
     */
    activeTabKey: DataPanelTabKey | null;
  };

  /**
   * Which fields are expanded or collapsed
   */
  expandedFieldSections: Record<string, boolean>;

  /**
   * True if the node itself is collapsed in the pipeline, hiding its sub-pipeline
   */
  collapsed: boolean;
};

export type BrickPipelineUIState = {
  /**
   * Flat map of all pipeline bricks including sub pipelines.
   * Key is the brick instanceId.
   */
  pipelineMap: PipelineMap;

  /**
   * The instanceId of the active node in the editor,
   *  or:
   *  @see FOUNDATION_NODE_ID
   */
  activeNodeId: UUID;

  /**
   * UI state of bricks in the mod component pipeline, including the starter brick
   */
  nodeUIStates: Record<UUID, BrickConfigurationUIState>;
};
