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

import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { ensureBrickConfigurationUIState } from "@/pageEditor/store/editor/editorSliceHelpers/ensureBrickConfigurationUiState";
import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { FOUNDATION_NODE_ID } from "@/pageEditor/store/editor/uiState";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import { type UUID } from "@/types/stringTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type Draft } from "immer";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

export function syncBrickConfigurationUIStates(
  state: Draft<EditorState>,
  modComponentFormState: ModComponentFormState,
) {
  const brickPipelineUIState =
    state.brickPipelineUIStateById[modComponentFormState.uuid];

  assertNotNullish(
    brickPipelineUIState,
    `Brick Pipeline UI State not found for ${modComponentFormState.uuid}`,
  );

  const pipelineMap = getPipelineMap(
    modComponentFormState.modComponent.brickPipeline,
  );

  brickPipelineUIState.pipelineMap = pipelineMap;

  // Pipeline brick instance IDs may have changed
  if (pipelineMap[brickPipelineUIState.activeNodeId] == null) {
    brickPipelineUIState.activeNodeId = FOUNDATION_NODE_ID;
  }

  // Remove BrickConfigurationUIStates for invalid node IDs
  for (const nodeId of Object.keys(
    brickPipelineUIState.nodeUIStates,
  ) as UUID[]) {
    // Don't remove the foundation BrickConfigurationUIState
    if (nodeId !== FOUNDATION_NODE_ID && pipelineMap[nodeId] == null) {
      delete brickPipelineUIState.nodeUIStates[nodeId];
    }
  }

  // Add missing BrickConfigurationUIStates
  for (const nodeId of Object.keys(pipelineMap) as UUID[]) {
    ensureBrickConfigurationUIState(brickPipelineUIState, nodeId);
  }
}

/* eslint-enable security/detect-object-injection */
