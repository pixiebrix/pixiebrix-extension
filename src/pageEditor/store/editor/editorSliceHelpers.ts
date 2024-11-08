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

import { type Draft } from "immer";
import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { type UUID } from "@/types/stringTypes";
import {
  FOUNDATION_NODE_ID,
  makeInitialBrickConfigurationUIState,
  makeInitialBrickPipelineUIState,
} from "@/pageEditor/store/editor/uiState";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import { type BrickPipelineUIState } from "@/pageEditor/store/editor/uiStateTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { clearModComponentTraces } from "@/telemetry/trace";
import { assertNotNullish } from "@/utils/nullishUtils";
import { remove } from "lodash";
import { selectGetModComponentFormStateByModComponentId } from "@/pageEditor/store/editor/editorSelectors";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

/** @internal */
export function ensureBrickPipelineUIState(
  state: Draft<EditorState>,
  modComponentId: UUID,
) {
  if (!state.brickPipelineUIStateById[modComponentId]) {
    state.brickPipelineUIStateById[modComponentId] =
      makeInitialBrickPipelineUIState();

    const modComponentFormState =
      selectGetModComponentFormStateByModComponentId({ editor: state })(
        modComponentId,
      );
    const pipeline = modComponentFormState?.modComponent.brickPipeline;

    assertNotNullish(
      pipeline,
      `Pipeline not found for mod component id: ${modComponentId}`,
    );

    state.brickPipelineUIStateById[modComponentId].pipelineMap =
      getPipelineMap(pipeline);
  }
}

/** @internal */
export function ensureBrickConfigurationUIState(
  state: Draft<BrickPipelineUIState>,
  nodeId: UUID,
) {
  state.nodeUIStates[nodeId] ??= makeInitialBrickConfigurationUIState(nodeId);
}

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

/**
 * Remove a draft mod component form state from the Page Editor.
 * @param state The redux state (slice)
 * @param formStateId The id for the mod component to remove
 */
export function markModComponentFormStateAsDeleted(
  state: Draft<EditorState>,
  formStateId: UUID,
) {
  // Some mod components in a mod may not have a corresponding mod component form state due to having never been
  // selected by the user in the UI. In this case, the mod component form state will not be in Redux.
  // However, in practice, in the Page Editor UI, the user must select a mod component to remove it, so there must
  // be a corresponding  form state in modComponentFormStates
  const [removedFormState] = remove(
    state.modComponentFormStates,
    (x) => x.uuid === formStateId,
  );
  assertNotNullish(removedFormState, "modComponentFormState not found with id");

  delete state.dirty[formStateId];
  delete state.brickPipelineUIStateById[formStateId];

  // Remove from list mod components available on the page, if available
  remove(state.availableDraftModComponentIds, formStateId);

  // Change the selection from the mod component to the mod
  if (state.activeModComponentId === formStateId) {
    state.activeModComponentId = null;
    state.activeModId = removedFormState.modMetadata.id;
  }

  // XXX: ideally this would only mark if the form state corresponds to an activated mod component. However,
  // there's currently no way to determine if there's an activated mod component solely from the form state.
  // The effect of adding the draft to deletedModComponentFormStatesByModId is benign - the mod will show as dirty
  // even if the only change is that you added/removed a draft mod component.
  // See discussion at: https://github.com/pixiebrix/pixiebrix-extension/pull/9320
  (state.deletedModComponentFormStateIdsByModId[
    removedFormState.modMetadata.id
  ] ??= []).push(formStateId);

  // Make sure we're not keeping any private data around from Page Editor sessions
  void clearModComponentTraces(formStateId);
}

export function setActiveModComponentId(
  state: Draft<EditorState>,
  modComponentFormState: ModComponentFormState,
) {
  state.error = null;
  state.activeModComponentId = modComponentFormState.uuid;
  state.activeModId = modComponentFormState.modMetadata.id;
  state.expandedModId = modComponentFormState.modMetadata.id;
  state.selectionSeq++;

  ensureBrickPipelineUIState(state, modComponentFormState.uuid);
}

/* eslint-enable security/detect-object-injection */
