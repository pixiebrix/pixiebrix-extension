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

import { ensureBrickConfigurationUIState } from "@/pageEditor/store/editor/editorSliceHelpers/ensureBrickConfigurationUiState";
import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { type UUID } from "@/types/stringTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type Draft } from "immer";

export function setActiveNodeId(state: Draft<EditorState>, nodeId: UUID) {
  assertNotNullish(
    state.activeModComponentId,
    "No active mod component id set",
  );
  const brickPipelineUIState =
    state.brickPipelineUIStateById[state.activeModComponentId];

  assertNotNullish(
    brickPipelineUIState,
    `No Brick Pipeline UI state found for active mod component: ${state.activeModComponentId}`,
  );
  ensureBrickConfigurationUIState(brickPipelineUIState, nodeId);
  brickPipelineUIState.activeNodeId = nodeId;
}
