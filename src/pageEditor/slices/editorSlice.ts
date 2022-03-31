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

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/errors";
import { clearExtensionTraces } from "@/telemetry/trace";
import { RecipeMetadata, RegistryId, UUID } from "@/core";
import {
  FOUNDATION_NODE_ID,
  makeInitialElementUIState,
  makeInitialNodeUIState,
} from "@/pageEditor/uiState/uiState";
import { WritableDraft } from "immer/dist/types/types-external";
import { BlockConfig } from "@/blocks/types";
import { ExtensionPointType } from "@/extensionPoints/types";
import {
  OptionsDefinition,
  RecipeDefinition,
  RecipeMetadataFormState,
} from "@/types/definitions";
import { NodeId } from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { EditorState, FormState } from "@/pageEditor/pageEditorTypes";
import { ElementUIState } from "@/pageEditor/uiState/uiStateTypes";
import { uuidv4 } from "@/types/helpers";

export const initialState: EditorState = {
  selectionSeq: 0,
  activeElement: null,
  activeRecipeId: null,
  error: null,
  beta: false,
  elements: [],
  knownEditable: [],
  dirty: {},
  inserting: null,
  isBetaUI: false,
  elementUIStates: {},
  showV3UpgradeMessageByElement: {},
  dirtyRecipeOptionsById: {},
  dirtyRecipeMetadataById: {},
  isAddToRecipeModalVisible: false,
};

/* eslint-disable security/detect-object-injection, @typescript-eslint/no-dynamic-delete -- lots of immer-style code here dealing with Records */
function ensureElementUIState(
  state: WritableDraft<EditorState>,
  elementId: UUID
) {
  if (!state.elementUIStates[elementId]) {
    state.elementUIStates[elementId] = makeInitialElementUIState();
  }
}

function ensureNodeUIState(
  state: WritableDraft<ElementUIState>,
  nodeId: NodeId
) {
  if (!state.nodeUIStates[nodeId]) {
    state.nodeUIStates[nodeId] = makeInitialNodeUIState(nodeId);
  }
}

function syncElementNodeUIStates(
  state: WritableDraft<EditorState>,
  element: FormState
) {
  const elementUIState = state.elementUIStates[element.uuid];
  const blockPipelineIds = element.extension.blockPipeline.map(
    (x) => x.instanceId
  );

  // Pipeline block instance IDs may have changed
  if (!blockPipelineIds.includes(elementUIState.activeNodeId)) {
    elementUIState.activeNodeId = FOUNDATION_NODE_ID;
  }

  // Remove NodeUIStates for invalid IDs
  for (const key of Object.keys(elementUIState.nodeUIStates)) {
    const nodeId = key as NodeId;
    // Don't remove the foundation NodeUIState
    if (nodeId !== FOUNDATION_NODE_ID && !blockPipelineIds.includes(nodeId)) {
      delete elementUIState.nodeUIStates[nodeId];
    }
  }

  // Add missing NodeUIStates
  for (const uuid of blockPipelineIds) {
    ensureNodeUIState(elementUIState, uuid);
  }
}

function setActiveNodeId(state: WritableDraft<EditorState>, nodeId: NodeId) {
  const elementUIState = state.elementUIStates[state.activeElement];
  ensureNodeUIState(elementUIState, nodeId);
  elementUIState.activeNodeId = nodeId;
}

export const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    toggleInsert(state, action: PayloadAction<ExtensionPointType>) {
      state.inserting = action.payload;
      state.beta = false;
      state.error = null;
    },
    markEditable(state, action: PayloadAction<RegistryId>) {
      state.knownEditable.push(action.payload);
    },
    addElement(state, action: PayloadAction<FormState>) {
      const element = action.payload;
      state.inserting = null;
      state.elements.push(element);
      state.error = null;
      state.dirty[element.uuid] = true;
      state.beta = false;
      state.activeElement = element.uuid;
      state.selectionSeq++;
      state.elementUIStates[element.uuid] = makeInitialElementUIState();
    },
    betaError(state, action: PayloadAction<{ error: string }>) {
      state.error = action.payload.error;
      state.beta = true;
      state.activeElement = null;
    },
    adapterError(state, action: PayloadAction<{ uuid: UUID; error: unknown }>) {
      const { uuid, error } = action.payload;
      state.error = getErrorMessage(error);
      state.beta = false;
      state.activeElement = uuid;
      state.selectionSeq++;
    },
    selectInstalled(state, action: PayloadAction<FormState>) {
      const { uuid } = action.payload;
      const index = state.elements.findIndex((x) => x.uuid === uuid);
      if (index >= 0) {
        state.elements[index] = action.payload;
      } else {
        state.elements.push(action.payload);
      }

      state.error = null;
      state.beta = null;
      state.activeElement = uuid;
      state.activeRecipeId = null;
      state.selectionSeq++;
      ensureElementUIState(state, uuid);
    },
    resetInstalled(state, actions: PayloadAction<FormState>) {
      const element = actions.payload;
      const index = state.elements.findIndex((x) => x.uuid === element.uuid);
      if (index >= 0) {
        state.elements[index] = element;
      } else {
        state.elements.push(element);
      }

      state.dirty[element.uuid] = false;
      state.error = null;
      state.beta = null;
      state.selectionSeq++;

      // Make sure we're not keeping any private data around from Page Editor sessions
      void clearExtensionTraces(element.uuid);

      syncElementNodeUIStates(state, element);
    },
    selectElement(state, action: PayloadAction<UUID>) {
      const elementId = action.payload;
      if (!state.elements.some((x) => x.uuid === elementId)) {
        throw new Error(`Unknown dynamic element: ${action.payload}`);
      }

      state.error = null;
      state.beta = null;
      state.activeElement = elementId;
      state.activeRecipeId = null;
      state.selectionSeq++;
      ensureElementUIState(state, elementId);
    },
    markSaved(state, action: PayloadAction<UUID>) {
      const element = state.elements.find((x) => action.payload === x.uuid);
      if (!element) {
        throw new Error(`Unknown dynamic element: ${action.payload}`);
      }

      if (!element.installed) {
        state.knownEditable.push(element.extensionPoint.metadata.id);
      }

      element.installed = true;
      state.dirty[element.uuid] = false;
      // Force a reload so the _new flags are correct on the readers
      state.selectionSeq++;
    },
    /**
     * Sync the redux state with the form state.
     * Used on by the page editor to set changed version of the element in the store.
     */
    editElement(state, action: PayloadAction<FormState>) {
      const element = action.payload;
      const index = state.elements.findIndex((x) => x.uuid === element.uuid);
      if (index < 0) {
        throw new Error(`Unknown dynamic element: ${element.uuid}`);
      }

      state.elements[index] = element;
      state.dirty[element.uuid] = true;

      syncElementNodeUIStates(state, element);
    },
    /**
     * Applies the update to the element
     */
    updateElement(
      state,
      action: PayloadAction<{ uuid: UUID } & Partial<FormState>>
    ) {
      const { uuid, ...elementUpdate } = action.payload;
      const index = state.elements.findIndex((x) => x.uuid === uuid);
      if (index < 0) {
        throw new Error(`Unknown dynamic element: ${uuid}`);
      }

      // @ts-expect-error -- Concrete variants of FromState are not mutually assignable.
      state.elements[index] = {
        ...state.elements[index],
        ...elementUpdate,
      };

      // Force reload of Formik state
      state.selectionSeq++;
    },
    removeElement(state, action: PayloadAction<UUID>) {
      const uuid = action.payload;
      if (state.activeElement === uuid) {
        state.activeElement = null;
      }

      state.elements.splice(
        state.elements.findIndex((x) => x.uuid === uuid),
        1
      );

      delete state.dirty[uuid];
      delete state.elementUIStates[uuid];

      // Make sure we're not keeping any private data around from Page Editor sessions
      void clearExtensionTraces(uuid);
    },
    selectRecipe(state, action: PayloadAction<RecipeDefinition>) {
      const recipe = action.payload;
      state.error = null;
      state.beta = null;
      state.activeElement = null;
      state.activeRecipeId = recipe.metadata.id;
      state.selectionSeq++;
    },
    setBetaUIEnabled(state, action: PayloadAction<boolean>) {
      state.isBetaUI = action.payload;
    },
    removeElementNodeUIState(
      state,
      action: PayloadAction<{
        nodeIdToRemove: NodeId;
        newActiveNodeId?: NodeId;
      }>
    ) {
      const elementUIState = state.elementUIStates[state.activeElement];
      const { nodeIdToRemove, newActiveNodeId } = action.payload;

      const activeNodeId = newActiveNodeId ?? FOUNDATION_NODE_ID;
      setActiveNodeId(state, activeNodeId);

      delete elementUIState.nodeUIStates[nodeIdToRemove];
    },
    setElementActiveNodeId(state, action: PayloadAction<NodeId>) {
      setActiveNodeId(state, action.payload);
    },
    setNodeDataPanelTabSelected(state, action: PayloadAction<string>) {
      const elementUIState = state.elementUIStates[state.activeElement];
      const nodeUIState =
        elementUIState.nodeUIStates[elementUIState.activeNodeId];
      nodeUIState.dataPanel.activeTabKey = action.payload;
    },
    setNodeDataPanelTabSearchQuery(
      state,
      action: PayloadAction<{ tabKey: string; query: string }>
    ) {
      const { tabKey, query } = action.payload;
      const elementUIState = state.elementUIStates[state.activeElement];
      const nodeUIState =
        elementUIState.nodeUIStates[elementUIState.activeNodeId];
      nodeUIState.dataPanel.tabQueries[tabKey] = query;
    },
    copyBlockConfig(state, action: PayloadAction<BlockConfig>) {
      const copy = { ...action.payload };
      delete copy.instanceId;
      state.copiedBlock = copy;
    },
    clearCopiedBlockConfig(state) {
      delete state.copiedBlock;
    },
    showV3UpgradeMessage(state) {
      state.showV3UpgradeMessageByElement[state.activeElement] = true;
    },
    hideV3UpgradeMessage(state) {
      state.showV3UpgradeMessageByElement[state.activeElement] = false;
    },
    editRecipeOptions(state, action: PayloadAction<OptionsDefinition>) {
      const recipeId = state.activeRecipeId;
      if (recipeId == null) {
        return;
      }

      const { payload: options } = action;
      state.dirtyRecipeOptionsById[recipeId] = options;
    },
    editRecipeMetadata(state, action: PayloadAction<RecipeMetadataFormState>) {
      const recipeId = state.activeRecipeId;
      if (recipeId == null) {
        return;
      }

      const { payload: metadata } = action;
      state.dirtyRecipeMetadataById[recipeId] = metadata;
    },
    resetRecipeMetadataAndOptions(state, action: PayloadAction<RegistryId>) {
      const { payload: recipeId } = action;
      delete state.dirtyRecipeMetadataById[recipeId];
      delete state.dirtyRecipeOptionsById[recipeId];
    },
    updateRecipeMetadataForElements(
      state,
      action: PayloadAction<RecipeMetadata>
    ) {
      const metadata = action.payload;
      const recipeElements = state.elements.filter(
        (element) => element.recipe?.id === metadata.id
      );
      for (const element of recipeElements) {
        element.recipe = metadata;
      }
    },
    showAddToRecipeModal(state) {
      state.isAddToRecipeModalVisible = true;
    },
    hideAddToRecipeModal(state) {
      state.isAddToRecipeModalVisible = false;
    },
    addElementToRecipe(
      state,
      action: PayloadAction<{
        elementId: UUID;
        recipeMetadata: RecipeMetadata;
        keepLocalCopy: boolean;
      }>
    ) {
      const {
        payload: { elementId, recipeMetadata, keepLocalCopy },
      } = action;
      const elementIndex = state.elements.findIndex(
        (element) => element.uuid === elementId
      );
      if (elementIndex < 0) {
        throw new Error(
          "Unable to add extension to blueprint, extension form state not found"
        );
      }

      const element = state.elements[elementIndex];

      const newId = uuidv4();
      state.elements.push({
        ...element,
        uuid: newId,
        recipe: recipeMetadata,
      });
      state.dirty[newId] = true;

      if (!keepLocalCopy) {
        ensureElementUIState(state, newId);
        state.activeElement = newId;
        state.elements.splice(elementIndex, 1);
        delete state.dirty[element.uuid];
        delete state.elementUIStates[element.uuid];
      }
    },
    removeElementFromRecipe(state, action: PayloadAction<UUID>) {
      const elementId = action.payload;
      const elementIndex = state.elements.findIndex(
        (element) => element.uuid === elementId
      );
      if (elementIndex < 0) {
        throw new Error(
          "Unable to remove extension from blueprint, extension form state not found"
        );
      }

      const element = state.elements[elementIndex];
      element.recipe = undefined;
      state.dirty[elementId] = true;

      // How do we mark the recipe dirty?

      // How do we 'reset' from this state?
    },
  },
});
/* eslint-enable security/detect-object-injection, @typescript-eslint/no-dynamic-delete -- re-enable rule */

export const { actions } = editorSlice;
