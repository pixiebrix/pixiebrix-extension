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
import { getErrorMessage } from "@/errors/errorHelpers";
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
  RecipeMetadataFormState,
} from "@/types/definitions";
import {
  EditorState,
  FormState,
  AddBlockLocation,
  ModalKey,
} from "@/pageEditor/pageEditorTypes";
import { ElementUIState, ErrorLevel } from "@/pageEditor/uiState/uiStateTypes";
import { uuidv4 } from "@/types/helpers";
import { cloneDeep, get, isEmpty, set } from "lodash";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import { getInvalidPath } from "@/utils/debugUtils";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import {
  selectActiveElement,
  selectActiveElementUIState,
  selectActiveNodeId,
} from "./editorSelectors";

export const initialState: EditorState = {
  selectionSeq: 0,
  activeElementId: null,
  activeRecipeId: null,
  expandedRecipeId: null,
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
  visibleModalKey: null,
  keepLocalCopyOnCreateRecipe: false,
  deletedElementsByRecipeId: {},
  newRecipeIds: [],
};

/* eslint-disable security/detect-object-injection, @typescript-eslint/no-dynamic-delete -- lots of immer-style code here dealing with Records */

function ensureElementUIState(
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

function ensureNodeUIState(state: WritableDraft<ElementUIState>, nodeId: UUID) {
  if (!state.nodeUIStates[nodeId]) {
    state.nodeUIStates[nodeId] = makeInitialNodeUIState(nodeId);
  }
}

function syncElementNodeUIStates(
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

function setActiveNodeId(state: WritableDraft<EditorState>, nodeId: UUID) {
  const elementUIState = state.elementUIStates[state.activeElementId];
  ensureNodeUIState(elementUIState, nodeId);
  elementUIState.activeNodeId = nodeId;
}

function removeElement(state: WritableDraft<EditorState>, uuid: UUID) {
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

function selectRecipeId(
  state: WritableDraft<EditorState>,
  recipeId: RegistryId
) {
  state.error = null;
  state.beta = null;
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

function editRecipeMetadata(
  state: WritableDraft<EditorState>,
  metadata: RecipeMetadataFormState
) {
  const recipeId = state.activeRecipeId;
  if (recipeId == null) {
    return;
  }

  state.dirtyRecipeMetadataById[recipeId] = metadata;
}

function editRecipeOptions(
  state: WritableDraft<EditorState>,
  options: OptionsDefinition
) {
  const recipeId = state.activeRecipeId;
  if (recipeId == null) {
    return;
  }

  state.dirtyRecipeOptionsById[recipeId] = options;
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
      state.activeElementId = element.uuid;
      state.activeRecipeId = null;
      state.expandedRecipeId = element.recipe?.id ?? state.expandedRecipeId;
      state.selectionSeq++;

      ensureElementUIState(state, element.uuid);
    },
    betaError(state, action: PayloadAction<{ error: string }>) {
      state.error = action.payload.error;
      state.beta = true;
      state.activeElementId = null;
    },
    adapterError(state, action: PayloadAction<{ uuid: UUID; error: unknown }>) {
      const { uuid, error } = action.payload;
      state.error = getErrorMessage(error);
      state.beta = false;
      state.activeElementId = uuid;
      state.selectionSeq++;
    },
    selectInstalled(state, action: PayloadAction<FormState>) {
      const element = action.payload;
      const index = state.elements.findIndex((x) => x.uuid === element.uuid);
      if (index >= 0) {
        state.elements[index] = action.payload;
      } else {
        state.elements.push(element);
      }

      state.error = null;
      state.beta = null;
      state.activeElementId = element.uuid;
      state.activeRecipeId = null;
      state.expandedRecipeId = element.recipe?.id ?? state.expandedRecipeId;
      state.selectionSeq++;
      ensureElementUIState(state, element.uuid);
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
      const element = state.elements.find((x) => x.uuid === elementId);
      if (!element) {
        throw new Error(`Unknown dynamic element: ${action.payload}`);
      }

      state.error = null;
      state.beta = null;
      state.activeElementId = elementId;
      state.expandedRecipeId = element.recipe?.id ?? state.expandedRecipeId;
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
        ...state.elements.at(index),
        ...elementUpdate,
      };

      // Force reload of Formik state
      state.selectionSeq++;
    },
    removeElement(state, action: PayloadAction<UUID>) {
      const uuid = action.payload;
      removeElement(state, uuid);
    },
    selectRecipeId(state, action: PayloadAction<RegistryId>) {
      const recipeId = action.payload;
      selectRecipeId(state, recipeId);
    },
    setBetaUIEnabled(state, action: PayloadAction<boolean>) {
      state.isBetaUI = action.payload;
    },
    removeElementNodeUIState(
      state,
      action: PayloadAction<{
        nodeIdToRemove: UUID;
        newActiveNodeId?: UUID;
      }>
    ) {
      const elementUIState = state.elementUIStates[state.activeElementId];
      const { nodeIdToRemove, newActiveNodeId } = action.payload;

      const activeNodeId = newActiveNodeId ?? FOUNDATION_NODE_ID;
      setActiveNodeId(state, activeNodeId);

      delete elementUIState.nodeUIStates[nodeIdToRemove];
    },
    setElementActiveNodeId(state, action: PayloadAction<UUID>) {
      setActiveNodeId(state, action.payload);
    },
    setNodeDataPanelTabSelected(state, action: PayloadAction<DataPanelTabKey>) {
      const elementUIState = state.elementUIStates[state.activeElementId];
      const nodeUIState =
        elementUIState.nodeUIStates[elementUIState.activeNodeId];
      nodeUIState.dataPanel.activeTabKey = action.payload;
    },

    /**
     * Updates the query on a DataPane tab with the JsonTree component
     */
    setNodeDataPanelTabSearchQuery(
      state,
      action: PayloadAction<{ tabKey: DataPanelTabKey; query: string }>
    ) {
      const { tabKey, query } = action.payload;
      const elementUIState = state.elementUIStates[state.activeElementId];
      elementUIState.nodeUIStates[elementUIState.activeNodeId].dataPanel[
        tabKey
      ].query = query;
    },

    /**
     * Updates the expanded state of the JsonTree component on a DataPanel tab
     */
    setNodeDataPanelTabExpandedState(
      state,
      action: PayloadAction<{
        tabKey: DataPanelTabKey;
        expandedState: TreeExpandedState;
      }>
    ) {
      const { tabKey, expandedState } = action.payload;
      const elementUIState = state.elementUIStates[state.activeElementId];
      elementUIState.nodeUIStates[elementUIState.activeNodeId].dataPanel[
        tabKey
      ].treeExpandedState = expandedState;
    },

    /**
     * Updates the active element of a Document or Form builder on the Preview tab
     */
    setNodePreviewActiveElement(state, action: PayloadAction<string>) {
      const activeElement = action.payload;
      const elementUIState = state.elementUIStates[state.activeElementId];

      elementUIState.nodeUIStates[elementUIState.activeNodeId].dataPanel[
        DataPanelTabKey.Preview
      ].activeElement = activeElement;

      elementUIState.nodeUIStates[elementUIState.activeNodeId].dataPanel[
        DataPanelTabKey.Outline
      ].activeElement = activeElement;
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
      state.showV3UpgradeMessageByElement[state.activeElementId] = true;
    },
    hideV3UpgradeMessage(state) {
      state.showV3UpgradeMessageByElement[state.activeElementId] = false;
    },
    editRecipeOptions(state, action: PayloadAction<OptionsDefinition>) {
      const { payload: options } = action;
      editRecipeOptions(state, options);
    },
    editRecipeMetadata(state, action: PayloadAction<RecipeMetadataFormState>) {
      const { payload: metadata } = action;
      editRecipeMetadata(state, metadata);
    },
    resetMetadataAndOptionsForRecipe(state, action: PayloadAction<RegistryId>) {
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
      state.visibleModalKey = ModalKey.ADD_TO_RECIPE;
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

      state.expandedRecipeId = recipeMetadata.id;

      if (!keepLocalCopy) {
        ensureElementUIState(state, newId);
        state.activeElementId = newId;
        state.elements.splice(elementIndex, 1);
        delete state.dirty[element.uuid];
        delete state.elementUIStates[element.uuid];
      }
    },
    showRemoveFromRecipeModal(state) {
      state.visibleModalKey = ModalKey.REMOVE_FROM_RECIPE;
    },
    removeElementFromRecipe(
      state,
      action: PayloadAction<{
        elementId: UUID;
        keepLocalCopy: boolean;
      }>
    ) {
      const { elementId, keepLocalCopy } = action.payload;
      const elementIndex = state.elements.findIndex(
        (element) => element.uuid === elementId
      );
      if (elementIndex < 0) {
        throw new Error(
          "Unable to remove extension from blueprint, extension form state not found"
        );
      }

      const element = state.elements[elementIndex];
      const recipeId = element.recipe.id;
      if (!state.deletedElementsByRecipeId[recipeId]) {
        state.deletedElementsByRecipeId[recipeId] = [];
      }

      state.deletedElementsByRecipeId[recipeId].push(element);
      state.elements.splice(elementIndex, 1);
      delete state.dirty[elementId];
      delete state.elementUIStates[elementId];
      state.activeElementId = undefined;

      if (keepLocalCopy) {
        const newId = uuidv4();
        state.elements.push({
          ...element,
          uuid: newId,
          recipe: undefined,
        });
        state.dirty[newId] = true;
        ensureElementUIState(state, newId);
        state.activeElementId = newId;
      }
    },
    showSaveAsNewRecipeModal(state) {
      state.visibleModalKey = ModalKey.SAVE_AS_NEW_RECIPE;
    },
    clearDeletedElementsForRecipe(state, action: PayloadAction<RegistryId>) {
      const recipeId = action.payload;
      delete state.deletedElementsByRecipeId[recipeId];
    },
    restoreDeletedElementsForRecipe(state, action: PayloadAction<RegistryId>) {
      const recipeId = action.payload;
      const deletedElements = state.deletedElementsByRecipeId[recipeId];
      if (!isEmpty(deletedElements)) {
        state.elements.push(...deletedElements);
        for (const elementId of deletedElements.map(
          (element) => element.uuid
        )) {
          state.dirty[elementId] = false;
          ensureElementUIState(state, elementId);
        }

        delete state.deletedElementsByRecipeId[recipeId];
      }
    },
    clearActiveRecipe(state) {
      state.activeRecipeId = null;
    },
    transitionSaveAsNewToCreateRecipeModal(state) {
      state.visibleModalKey = ModalKey.CREATE_RECIPE;
      state.keepLocalCopyOnCreateRecipe = false;
    },
    transitionAddToCreateRecipeModal(state, action: PayloadAction<boolean>) {
      state.visibleModalKey = ModalKey.CREATE_RECIPE;
      state.keepLocalCopyOnCreateRecipe = action.payload;
    },
    finishSaveAsNewRecipe(
      state,
      action: PayloadAction<{
        oldRecipeId: RegistryId;
        newRecipeId: RegistryId;
        metadata: RecipeMetadataFormState;
        options: OptionsDefinition;
      }>
    ) {
      const { oldRecipeId, newRecipeId, metadata, options } = action.payload;

      // Remove old recipe extension form states
      for (const element of state.elements.filter(
        (element) => element.recipe?.id === oldRecipeId
      )) {
        removeElement(state, element.uuid);
      }

      // Clear deleted elements
      delete state.deletedElementsByRecipeId[oldRecipeId];

      // Select the new recipe
      selectRecipeId(state, newRecipeId);

      // Set the metadata and options
      editRecipeMetadata(state, metadata);
      editRecipeOptions(state, options);

      // Clean up the old metadata and options
      delete state.dirtyRecipeMetadataById[oldRecipeId];
      delete state.dirtyRecipeOptionsById[oldRecipeId];
    },
    addNode(
      state,
      action: PayloadAction<{
        block: BlockConfig;
        pipelinePath: string;
        pipelineIndex: number;
      }>
    ) {
      const { block, pipelinePath, pipelineIndex } = action.payload;

      const element = state.elements.find(
        (x) => x.uuid === state.activeElementId
      );

      const pipeline = get(element, pipelinePath);
      if (pipeline == null) {
        console.error("Invalid pipeline path for element: %s", pipelinePath, {
          block,
          invalidPath: getInvalidPath(cloneDeep(element), pipelinePath),
          element: cloneDeep(element),
          pipelinePath,
          pipelineIndex,
        });
        throw new Error(`Invalid pipeline path for element: ${pipelinePath}`);
      }

      pipeline.splice(pipelineIndex, 0, block);
      syncElementNodeUIStates(state, element);
      setActiveNodeId(state, block.instanceId);
      state.dirty[element.uuid] = true;

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
    },
    moveNode(
      state,
      action: PayloadAction<{
        nodeId: UUID;
        direction: "up" | "down";
      }>
    ) {
      const { nodeId, direction } = action.payload;
      const element = selectActiveElement({ editor: state });
      const elementUiState = selectActiveElementUIState({ editor: state });
      const { pipelinePath, index } = elementUiState.pipelineMap[nodeId];
      const pipeline = get(element, pipelinePath);

      if (direction === "up") {
        // Swap the prev and current index values in the pipeline array, "up" in
        //  the UI means a lower index in the array
        [pipeline[index - 1], pipeline[index]] = [
          pipeline[index],
          pipeline[index - 1],
        ];
      } else {
        // Swap the current and next index values in the pipeline array, "down"
        //  in the UI means a higher index in the array
        [pipeline[index], pipeline[index + 1]] = [
          pipeline[index + 1],
          pipeline[index],
        ];
      }

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
    },
    removeNode(state, action: PayloadAction<UUID>) {
      const nodeIdToRemove = action.payload;
      const element = selectActiveElement({ editor: state });
      const elementUiState = selectActiveElementUIState({ editor: state });
      const { pipelinePath, index } =
        elementUiState.pipelineMap[nodeIdToRemove];
      const pipeline = get(element, pipelinePath);

      // TODO: this fails when the brick is the last in a pipeline, need to select parent node
      const nextActiveNode =
        index + 1 === pipeline.length
          ? pipeline[index - 1] // Last item, select previous
          : pipeline[index + 1]; // Not last item, select next
      pipeline.splice(index, 1);

      syncElementNodeUIStates(state, element);
      delete elementUiState.errorMap[nodeIdToRemove];

      elementUiState.activeNodeId =
        nextActiveNode?.instanceId ?? FOUNDATION_NODE_ID;

      state.dirty[element.uuid] = true;

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
    },
    setFieldsError(state, action: PayloadAction<FormikErrorTree>) {
      const fieldErrors = action.payload;
      const nodeId = selectActiveNodeId({ editor: state });
      const elementUiState = selectActiveElementUIState({ editor: state });
      const elementErrors = elementUiState.errorMap;
      set(elementErrors, [nodeId, "fieldErrors"], fieldErrors);
    },
    setNodeError(
      state,
      action: PayloadAction<{
        nodeId: UUID;
        namespace: string;
        message: string;
        level?: ErrorLevel;
      }>
    ) {
      const {
        nodeId,
        namespace,
        message,
        level = ErrorLevel.Critical,
      } = action.payload;
      const { errorMap } = selectActiveElementUIState({ editor: state });
      const nodeErrors = errorMap[nodeId]?.errors;
      if (typeof nodeErrors === "undefined") {
        set(errorMap, [nodeId, "errors"], [{ namespace, message, level }]);
      } else {
        set(
          errorMap,
          [nodeId, "errors"],
          [
            ...nodeErrors.filter((x) => x.namespace !== namespace),
            { namespace, message, level },
          ]
        );
      }
    },
    clearNodeError(
      state,
      action: PayloadAction<{
        nodeId: UUID;
        namespace: string;
      }>
    ) {
      const { nodeId, namespace } = action.payload;
      const { errorMap } = selectActiveElementUIState({ editor: state });
      const nodeErrors = errorMap[nodeId]?.errors;
      if (nodeErrors != null) {
        errorMap[nodeId].errors = nodeErrors.filter(
          (x) => x.namespace !== namespace
        );
      }
    },
    showAddBlockModal(state, action: PayloadAction<AddBlockLocation>) {
      state.addBlockLocation = action.payload;
      state.visibleModalKey = ModalKey.ADD_BLOCK;
    },
    hideModal(state) {
      state.visibleModalKey = null;
    },
  },
});
/* eslint-enable security/detect-object-injection, @typescript-eslint/no-dynamic-delete -- re-enable rule */

export const { actions } = editorSlice;
