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
  makeInitialElementUIState,
  makeInitialNodeUIState,
} from "@/pageEditor/uiState/uiState";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import { type ModComponentUIState } from "@/pageEditor/uiState/uiStateTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { clearExtensionTraces } from "@/telemetry/trace";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

export function ensureElementUIState(
  state: Draft<EditorState>,
  elementId: UUID,
) {
  if (!state.brickPipelineUIStateById[elementId]) {
    state.brickPipelineUIStateById[elementId] = makeInitialElementUIState();
    const pipeline = state.modComponentFormStates.find(
      (x) => x.uuid === elementId,
    )?.extension.blockPipeline;

    assertNotNullish(
      pipeline,
      `Pipeline not found for elementId: ${elementId}`,
    );

    state.brickPipelineUIStateById[elementId].pipelineMap =
      getPipelineMap(pipeline);
  }
}

export function ensureNodeUIState(
  state: Draft<ModComponentUIState>,
  nodeId: UUID,
) {
  state.nodeUIStates[nodeId] ??= makeInitialNodeUIState(nodeId);
}

export function syncElementNodeUIStates(
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
    modComponentFormState.extension.blockPipeline,
  );

  brickPipelineUIState.pipelineMap = pipelineMap;

  // Pipeline block instance IDs may have changed
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
  assertNotNullish(state.activeModComponentId, "No active element id set");
  const brickPipelineUIState =
    state.brickPipelineUIStateById[state.activeModComponentId];

  assertNotNullish(
    brickPipelineUIState,
    `No Brick Pipeline UI state found for active element: ${state.activeModComponentId}`,
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
  void clearExtensionTraces(uuid);
}

/**
 * Remove a given recipe's extra data from a redux state object
 * @param state The editor redux state
 * @param modId The id of the recipe to remove
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

export function selectRecipeId(
  state: Draft<EditorState>,
  recipeId: RegistryId,
) {
  state.error = null;
  state.beta = false;
  state.activeModComponentId = null;

  if (state.expandedModId === recipeId && state.activeModId === recipeId) {
    // "un-toggle" the recipe, if it's already selected
    state.expandedModId = null;
  } else {
    state.expandedModId = recipeId;
  }

  state.activeModId = recipeId;
  state.selectionSeq++;
}

export function editRecipeMetadata(
  state: Draft<EditorState>,
  metadata: ModMetadataFormState,
) {
  const recipeId = state.activeModId;
  if (recipeId == null) {
    return;
  }

  state.dirtyModMetadataById[recipeId] = metadata;
}

export function editRecipeOptionsDefinitions(
  state: Draft<EditorState>,
  options: ModOptionsDefinition,
) {
  const recipeId = state.activeModId;
  if (recipeId == null) {
    return;
  }

  state.dirtyModOptionsById[recipeId] = options as Draft<ModOptionsDefinition>;
}

export function makeModComponentFormStateActive(
  state: Draft<EditorState>,
  element: ModComponentFormState,
) {
  state.error = null;
  state.beta = false;
  state.activeModComponentId = element.uuid;
  state.activeModId = null;
  state.expandedModId = element.recipe?.id ?? state.expandedModId;
  state.selectionSeq++;

  ensureElementUIState(state, element.uuid);
}

/* eslint-enable security/detect-object-injection */
