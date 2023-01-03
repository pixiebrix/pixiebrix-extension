/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type WritableDraft } from "immer/dist/types/types-external";
import { type EditorState } from "@/pageEditor/pageEditorTypes";
import { type RegistryId, type UUID } from "@/core";
import {
  FOUNDATION_NODE_ID,
  makeInitialElementUIState,
  makeInitialNodeUIState,
} from "@/pageEditor/uiState/uiState";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import { type ElementUIState } from "@/pageEditor/uiState/uiStateTypes";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { clearExtensionTraces } from "@/telemetry/trace";
import {
  type OptionsDefinition,
  type RecipeMetadataFormState,
} from "@/types/definitions";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

export function ensureElementUIState(
  state: WritableDraft<EditorState>,
  elementId: UUID
) {
  if (!state.elementUIStates[elementId]) {
    state.elementUIStates[elementId] = makeInitialElementUIState();
    const pipeline = state.elements.find((x) => x.uuid === elementId).extension
      .blockPipeline;
    state.elementUIStates[elementId].pipelineMap = getPipelineMap(pipeline);
  }
}

export function ensureNodeUIState(
  state: WritableDraft<ElementUIState>,
  nodeId: UUID
) {
  if (!state.nodeUIStates[nodeId]) {
    state.nodeUIStates[nodeId] = makeInitialNodeUIState(nodeId);
  }
}

export function syncElementNodeUIStates(
  state: WritableDraft<EditorState>,
  element: FormState
) {
  const elementUIState = state.elementUIStates[element.uuid];

  const pipelineMap = getPipelineMap(element.extension.blockPipeline);

  elementUIState.pipelineMap = pipelineMap;

  // Pipeline block instance IDs may have changed
  if (pipelineMap[elementUIState.activeNodeId] == null) {
    elementUIState.activeNodeId = FOUNDATION_NODE_ID;
  }

  // Remove NodeUIStates for invalid IDs
  for (const nodeId of Object.keys(elementUIState.nodeUIStates) as UUID[]) {
    // Don't remove the foundation NodeUIState
    if (nodeId !== FOUNDATION_NODE_ID && pipelineMap[nodeId] == null) {
      delete elementUIState.nodeUIStates[nodeId];
    }
  }

  // Add missing NodeUIStates
  for (const nodeId of Object.keys(pipelineMap) as UUID[]) {
    ensureNodeUIState(elementUIState, nodeId);
  }
}

export function setActiveNodeId(
  state: WritableDraft<EditorState>,
  nodeId: UUID
) {
  const elementUIState = state.elementUIStates[state.activeElementId];
  ensureNodeUIState(elementUIState, nodeId);
  elementUIState.activeNodeId = nodeId;
}

export function removeElement(state: WritableDraft<EditorState>, uuid: UUID) {
  if (state.activeElementId === uuid) {
    state.activeElementId = null;
  }

  // This is called from the remove-recipe logic. When removing all extensions
  // in a recipe, some of them may not have been selected by the user in the UI yet,
  // and so may not have been moved into state.elements yet.
  const index = state.elements.findIndex((x) => x.uuid === uuid);
  if (index > -1) {
    state.elements.splice(index, 1);
  }

  delete state.dirty[uuid];
  delete state.elementUIStates[uuid];

  // Make sure we're not keeping any private data around from Page Editor sessions
  void clearExtensionTraces(uuid);
}

export function selectRecipeId(
  state: WritableDraft<EditorState>,
  recipeId: RegistryId
) {
  state.error = null;
  state.beta = false;
  state.activeElementId = null;

  if (
    state.expandedRecipeId === recipeId &&
    state.activeRecipeId === recipeId
  ) {
    // "un-toggle" the recipe, if it's already selected
    state.expandedRecipeId = null;
  } else {
    state.expandedRecipeId = recipeId;
  }

  state.activeRecipeId = recipeId;
  state.selectionSeq++;
}

export function editRecipeMetadata(
  state: WritableDraft<EditorState>,
  metadata: RecipeMetadataFormState
) {
  const recipeId = state.activeRecipeId;
  if (recipeId == null) {
    return;
  }

  state.dirtyRecipeMetadataById[recipeId] = metadata;
}

export function editRecipeOptionsDefinitions(
  state: WritableDraft<EditorState>,
  options: OptionsDefinition
) {
  const recipeId = state.activeRecipeId;
  if (recipeId == null) {
    return;
  }

  state.dirtyRecipeOptionsById[recipeId] = options;
}

export function activateElement(
  state: WritableDraft<EditorState>,
  element: FormState
) {
  state.error = null;
  state.beta = false;
  state.activeElementId = element.uuid;
  state.activeRecipeId = null;
  state.expandedRecipeId = element.recipe?.id ?? state.expandedRecipeId;
  state.selectionSeq++;

  ensureElementUIState(state, element.uuid);
}

/* eslint-enable security/detect-object-injection */
