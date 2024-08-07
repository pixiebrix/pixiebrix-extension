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

import { type UUID } from "@/types/stringTypes";
import {
  type BrickPipelineUIState,
  type BrickConfigurationUIState,
  type DataPanelTabUIState,
} from "@/pageEditor/store/editor/uiStateTypes";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";

export const FOUNDATION_NODE_ID = "foundation" as UUID;

export function makeInitialDataTabState(): DataPanelTabUIState {
  return {
    query: "",
    treeExpandedState: {},
    activeElement: null,
  };
}

export function makeInitialBrickConfigurationUIState(
  nodeId: UUID,
): BrickConfigurationUIState {
  const brickConfigurationUIState: BrickConfigurationUIState = {
    nodeId,
    // @ts-expect-error -- initializing the Tab states down below
    dataPanel: {
      activeTabKey: null,
    },
    expandedFieldSections: {},
    collapsed: false,
  };

  for (const tab of Object.values(DataPanelTabKey)) {
    // eslint-disable-next-line security/detect-object-injection -- tab comes from a known enum
    brickConfigurationUIState.dataPanel[tab] = makeInitialDataTabState();
  }

  return brickConfigurationUIState;
}

export function makeInitialBrickPipelineUIState(): BrickPipelineUIState {
  return {
    pipelineMap: {},
    activeNodeId: FOUNDATION_NODE_ID,
    nodeUIStates: {
      [FOUNDATION_NODE_ID]:
        makeInitialBrickConfigurationUIState(FOUNDATION_NODE_ID),
    },
  };
}
