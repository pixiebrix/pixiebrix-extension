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

import { UUID } from "@/core";
import {
  ElementUIState,
  NodeUIState,
  TabUIState,
} from "@/pageEditor/uiState/uiStateTypes";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";

export const FOUNDATION_NODE_ID = "foundation" as UUID;

function makeInitialDataTabState(): TabUIState {
  return {
    query: "",
    treeExpandedState: {},
    activeElement: null,
  };
}

export function makeInitialNodeUIState(nodeId: UUID): NodeUIState {
  const nodeUIState: NodeUIState = {
    nodeId,
    // @ts-expect-error -- initializing the Tab states down below
    dataPanel: {
      activeTabKey: null,
    },
  };

  for (const tab of Object.values(DataPanelTabKey)) {
    // eslint-disable-next-line security/detect-object-injection -- tab comes from a known enum
    nodeUIState.dataPanel[tab] = makeInitialDataTabState();
  }

  return nodeUIState;
}

export function makeInitialElementUIState(): ElementUIState {
  return {
    pipelineMap: {},
    errorMap: {},
    activeNodeId: FOUNDATION_NODE_ID,
    nodeUIStates: {
      [FOUNDATION_NODE_ID]: makeInitialNodeUIState(FOUNDATION_NODE_ID),
    },
  };
}
