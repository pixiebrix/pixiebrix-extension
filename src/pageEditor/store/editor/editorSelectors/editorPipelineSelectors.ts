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

import type { UUID } from "@/types/stringTypes";
import type { EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { createSelector } from "@reduxjs/toolkit";
import type { BrickPipelineUIState } from "@/pageEditor/store/editor/uiStateTypes";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { selectActiveModComponentFormState } from "@/pageEditor/store/editor/editorSelectors/editorModComponentSelectors";
import type { ReportEventData } from "@/telemetry/telemetryTypes";

export function selectActiveBrickPipelineUIState({
  editor,
}: EditorRootState): Nullishable<BrickPipelineUIState> {
  if (editor.activeModComponentId == null) {
    console.warn(
      "selectActiveBrickPipelineUIState called without activeModComponentId",
    );
    return null;
  }

  return editor.brickPipelineUIStateById[editor.activeModComponentId];
}

export const selectActiveBrickConfigurationUIState = createSelector(
  selectActiveBrickPipelineUIState,
  (brickPipelineUIState) =>
    brickPipelineUIState?.nodeUIStates[brickPipelineUIState.activeNodeId],
);

export const selectActiveNodeId = createSelector(
  selectActiveBrickPipelineUIState,
  (brickPipelineUIState) => brickPipelineUIState?.activeNodeId,
);

export const selectActiveNodeInfo = createSelector(
  selectActiveBrickPipelineUIState,
  selectActiveNodeId,
  (
    uiState: Nullishable<BrickPipelineUIState>,
    activeNodeId: Nullishable<UUID>,
  ) => {
    assertNotNullish(
      uiState,
      `uiState is ${typeof uiState === "object" ? "null" : "undefined"}`,
    );

    assertNotNullish(activeNodeId, "activeNodeId is nullish");

    // eslint-disable-next-line security/detect-object-injection -- UUID
    const activeNodeInfo = uiState.pipelineMap[activeNodeId];

    assertNotNullish(
      activeNodeInfo,
      `activeNodeInfo not found for node id: ${activeNodeId}`,
    );

    return activeNodeInfo;
  },
);
const activeModComponentNodeInfoSelector = createSelector(
  selectActiveBrickPipelineUIState,
  (state: EditorRootState, instanceId: UUID) => instanceId,
  (uiState: BrickPipelineUIState, instanceId: UUID) =>
    // eslint-disable-next-line security/detect-object-injection -- using a node uuid
    uiState.pipelineMap[instanceId],
);
export const selectActiveModComponentNodeInfo =
  (instanceId: UUID) => (state: EditorRootState) =>
    activeModComponentNodeInfoSelector(state, instanceId);
/**
 * Return event telemetry data for the currently selected node.
 */
export const selectActiveNodeEventData = createSelector(
  selectActiveModComponentFormState,
  selectActiveNodeInfo,
  (activeModComponentFormState, activeNodeInfo) => {
    assertNotNullish(
      activeModComponentFormState,
      "selectActiveNodeEventData can only be called from a mod component context",
    );

    return {
      modId: activeModComponentFormState.modMetadata.id,
      brickId: activeNodeInfo.blockId,
    } satisfies ReportEventData;
  },
);
export const selectPipelineMap = createSelector(
  selectActiveBrickPipelineUIState,
  (uiState: BrickPipelineUIState) => uiState?.pipelineMap,
);

export const selectCollapsedNodes = createSelector(
  selectActiveBrickPipelineUIState,
  (brickPipelineUIState: BrickPipelineUIState) =>
    Object.entries(brickPipelineUIState.nodeUIStates)
      .map(([nodeId, { collapsed }]) => (collapsed ? nodeId : null))
      .filter((nodeId) => nodeId != null),
);

const parentNodeInfoSelector = createSelector(
  selectActiveBrickPipelineUIState,
  (_state: EditorRootState, nodeId: UUID) => nodeId,
  (brickPipelineUIState: BrickPipelineUIState, nodeId: UUID) => {
    if (brickPipelineUIState == null) {
      return null;
    }

    // eslint-disable-next-line security/detect-object-injection -- UUID
    const { parentNodeId } = brickPipelineUIState.pipelineMap[nodeId] ?? {};
    if (!parentNodeId) {
      return null;
    }

    // eslint-disable-next-line security/detect-object-injection -- UUID
    return brickPipelineUIState.pipelineMap[parentNodeId];
  },
);

/**
 * Return the brick with the pipeline that contains the given node.
 * @param nodeId the instance id of the brick pipeline node
 */
export const selectParentNodeInfo =
  (nodeId: UUID) => (state: EditorRootState) =>
    parentNodeInfoSelector(state, nodeId);

export const selectAddBrickLocation = ({ editor }: EditorRootState) =>
  editor.addBrickLocation;
