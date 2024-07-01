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
import {
  type EditorState,
  type ModMetadataFormState,
} from "@/pageEditor/pageEditorTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import {
  FOUNDATION_NODE_ID,
  makeInitialBrickPipelineUIState,
  makeInitialNodeUIState,
} from "@/pageEditor/uiState/uiState";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import { type BrickPipelineUIState } from "@/pageEditor/uiState/uiStateTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { clearModComponentTraces } from "@/telemetry/trace";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

export function ensureBrickPipelineUIState(
  state: Draft<EditorState>,
  modComponentId: UUID,
) {
  if (!state.brickPipelineUIStateById[modComponentId]) {
    state.brickPipelineUIStateById[modComponentId] =
      makeInitialBrickPipelineUIState();
    const pipeline = state.modComponentFormStates.find(
      (x) => x.uuid === modComponentId,
    )?.modComponent.blockPipeline;

    assertNotNullish(
      pipeline,
      `Pipeline not found for mod component id: ${modComponentId}`,
    );

    state.brickPipelineUIStateById[modComponentId].pipelineMap =
      getPipelineMap(pipeline);
  }
}

export function ensureNodeUIState(
  state: Draft<BrickPipelineUIState>,
  nodeId: UUID,
) {
  state.nodeUIStates[nodeId] ??= makeInitialNodeUIState(nodeId);
}

export function syncNodeUIStates(
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
    modComponentFormState.modComponent.blockPipeline,
  );

  brickPipelineUIState.pipelineMap = pipelineMap;

  // Pipeline brick instance IDs may have changed
  if (pipelineMap[brickPipelineUIState.activeNodeId] == null) {
    brickPipelineUIState.activeNodeId = FOUNDATION_NODE_ID;
  }

  // Remove NodeUIStates for invalid IDs
  for (const nodeId of Object.keys(
    brickPipelineUIState.nodeUIStates,
  ) as UUID[]) {
    // Don't remove the foundation NodeUIState
    if (nodeId !== FOUNDATION_NODE_ID && pipelineMap[nodeId] == null) {
      delete brickPipelineUIState.nodeUIStates[nodeId];
    }
  }

  // Add missing NodeUIStates
  for (const nodeId of Object.keys(pipelineMap) as UUID[]) {
    ensureNodeUIState(brickPipelineUIState, nodeId);
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
  ensureNodeUIState(brickPipelineUIState, nodeId);
  brickPipelineUIState.activeNodeId = nodeId;
}

/**
 * Remove a mod component form state from the Page Editor. This could result in deleting the mod component if
 * it is not saved to the cloud as a standalone mod.
 * @param state The redux state (slice)
 * @param uuid The id for the mod component to remove
 */
export function removeModComponentFormState(
  state: Draft<EditorState>,
  uuid: UUID,
) {
  if (state.activeModComponentId === uuid) {
    state.activeModComponentId = null;
  }

  // Some mod components in a mod may not have a corresponding mod component form state due to having never been selected
  // by the user in the UI. In this case, the mod component form state will not be in redux.
  const index = state.modComponentFormStates.findIndex((x) => x.uuid === uuid);
  if (index > -1) {
    state.modComponentFormStates.splice(index, 1);
  }

  delete state.dirty[uuid];
  delete state.brickPipelineUIStateById[uuid];

  const draftIndex = state.availableDraftModComponentIds.indexOf(uuid);
  if (draftIndex > -1) {
    // Mod component is available, remove from list of available ids
    state.availableDraftModComponentIds.splice(draftIndex, 1);
  }

  // Make sure we're not keeping any private data around from Page Editor sessions
  void clearModComponentTraces(uuid);
}

/**
 * Remove a given mod's extra data from a redux state object
 * @param state The editor redux state
 * @param modId The id of the mod to remove
 */
export function removeModData(state: Draft<EditorState>, modId: RegistryId) {
  if (state.activeModId === modId) {
    state.activeModId = null;
  }

  if (state.expandedModId === modId) {
    state.expandedModId = null;
  }

  delete state.dirtyModOptionsById[modId];
  delete state.dirtyModMetadataById[modId];
  delete state.deletedModComponentFormStatesByModId[modId];
}

export function setActiveModId(state: Draft<EditorState>, modId: RegistryId) {
  state.error = null;
  state.beta = false;
  state.activeModComponentId = null;

  if (state.expandedModId === modId && state.activeModId === modId) {
    // "un-toggle" the mod, if it's already selected
    state.expandedModId = null;
  } else {
    state.expandedModId = modId;
  }

  state.activeModId = modId;
  state.selectionSeq++;
}

export function editModMetadata(
  state: Draft<EditorState>,
  metadata: ModMetadataFormState,
) {
  const { activeModId } = state;
  if (activeModId == null) {
    return;
  }

  state.dirtyModMetadataById[activeModId] = metadata;
}

export function editModOptionsDefinitions(
  state: Draft<EditorState>,
  options: ModOptionsDefinition,
) {
  const { activeModId } = state;
  if (activeModId == null) {
    return;
  }

  state.dirtyModOptionsById[activeModId] =
    options as Draft<ModOptionsDefinition>;
}

export function setActiveModComponentId(
  state: Draft<EditorState>,
  modComponentFormState: ModComponentFormState,
) {
  state.error = null;
  state.beta = false;
  state.activeModComponentId = modComponentFormState.uuid;
  state.activeModId = null;
  state.expandedModId =
    modComponentFormState.modMetadata?.id ?? state.expandedModId;
  state.selectionSeq++;

  ensureBrickPipelineUIState(state, modComponentFormState.uuid);
}

/* eslint-enable security/detect-object-injection */
