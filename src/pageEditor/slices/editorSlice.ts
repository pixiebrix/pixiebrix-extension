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

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { clearExtensionTraces } from "@/telemetry/trace";
import { type RecipeMetadata, type RegistryId, type UUID } from "@/core";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { type BlockConfig } from "@/blocks/types";
import { type ExtensionPointType } from "@/extensionPoints/types";
import {
  type OptionsDefinition,
  type RecipeMetadataFormState,
} from "@/types/definitions";
import {
  type AddBlockLocation,
  type EditorRootState,
  type EditorState,
  ModalKey,
} from "@/pageEditor/pageEditorTypes";
import { uuidv4 } from "@/types/helpers";
import {
  cloneDeep,
  compact,
  differenceBy,
  get,
  intersection,
  isEmpty,
  pull,
  uniq,
} from "lodash";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { type TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { getInvalidPath } from "@/utils/debugUtils";
import {
  selectActiveElement,
  selectActiveElementUIState,
  selectNotDeletedElements,
  selectNotDeletedExtensions,
} from "./editorSelectors";
import {
  type FormState,
  isQuickBarExtensionPoint,
} from "@/pageEditor/extensionPoints/formStateTypes";
import reportError from "@/telemetry/reportError";
import {
  activateElement,
  editRecipeMetadata,
  editRecipeOptions,
  ensureElementUIState,
  removeElement,
  selectRecipeId,
  setActiveNodeId,
  syncElementNodeUIStates,
} from "@/pageEditor/slices/editorSliceHelpers";
import { produce } from "immer";
import { normalizePipelineForEditor } from "@/pageEditor/extensionPoints/pipelineMapping";
import { type ExtensionsRootState } from "@/store/extensionsTypes";
import {
  checkAvailable,
  getInstalledExtensionPoints,
} from "@/contentScript/messenger/api";
import { getCurrentURL, thisTab } from "@/pageEditor/utils";
import { resolveDefinitions } from "@/registry/internal";
import { QuickBarExtensionPoint } from "@/extensionPoints/quickBarExtension";
import { testMatchPatterns } from "@/blocks/available";
import { type BaseExtensionPointState } from "@/pageEditor/extensionPoints/elementConfig";
import { BusinessError } from "@/errors/businessErrors";
import { serializeError } from "serialize-error";
import { isExtension } from "@/pageEditor/sidebar/common";
import { type StorageInterface } from "@/store/StorageInterface";
import { localStorage } from "redux-persist-webextension-storage";

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
  availableInstalledIds: [],
  unavailableInstalledCount: 0,
  isPendingInstalledExtensions: false,
  availableDynamicIds: [],
  unavailableDynamicCount: 0,
  isPendingDynamicExtensions: false,
};

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

const cloneActiveExtension = createAsyncThunk<
  void,
  void,
  { state: EditorRootState }
>("editor/cloneActiveExtension", async (arg, thunkAPI) => {
  const state = thunkAPI.getState();
  const newElement = await produce(
    selectActiveElement(state),
    async (draft) => {
      draft.uuid = uuidv4();
      draft.label += " - copy";
      // Remove from its recipe, if any (the user can add it to any recipe after creation)
      delete draft.recipe;
      // Re-generate instance IDs for all the bricks in the extension
      draft.extension.blockPipeline = await normalizePipelineForEditor(
        draft.extension.blockPipeline
      );
    }
  );
  // Add the cloned extension
  thunkAPI.dispatch(actions.addElement(newElement));
});

type AvailableInstalled = {
  availableInstalledIds: UUID[];
  unavailableCount: number;
};

const checkAvailableInstalledExtensions = createAsyncThunk<
  AvailableInstalled,
  void,
  { state: EditorRootState & ExtensionsRootState }
>("editor/checkAvailableInstalledExtensions", async (arg, thunkAPI) => {
  const elements = selectNotDeletedElements(thunkAPI.getState());
  const extensions = selectNotDeletedExtensions(thunkAPI.getState());
  const extensionPoints = await getInstalledExtensionPoints(thisTab);
  const installedExtensionPoints = new Map(
    extensionPoints.map((extensionPoint) => [extensionPoint.id, extensionPoint])
  );
  const resolved = await Promise.all(
    extensions.map(async (extension) => resolveDefinitions(extension))
  );
  const tabUrl = await getCurrentURL();
  const availableExtensionPointIds = resolved
    .filter((x) => {
      const extensionPoint = installedExtensionPoints.get(x.extensionPointId);
      // Not installed means not available
      if (extensionPoint == null) {
        return false;
      }

      // QuickBar is installed on every page, need to filter by the documentUrlPatterns
      if (QuickBarExtensionPoint.isQuickBarExtensionPoint(extensionPoint)) {
        return testMatchPatterns(extensionPoint.documentUrlPatterns, tabUrl);
      }

      return true;
    })
    .map((x) => x.id);

  // Note: we can take out this filter if and when we persist the editor
  // slice and remove installed extensions when they become dynamic elements
  const notDynamicInstalled = extensions.filter(
    (extension) => !elements.some((element) => element.uuid === extension.id)
  );

  const availableInstalledIds = notDynamicInstalled
    .filter((x) => availableExtensionPointIds.includes(x.id))
    .map((x) => x.id);

  const unavailableCount =
    notDynamicInstalled.length - availableInstalledIds.length;

  return { availableInstalledIds, unavailableCount };
});

async function isElementAvailable(
  tabUrl: string,
  elementExtensionPoint: BaseExtensionPointState
): Promise<boolean> {
  if (isQuickBarExtensionPoint(elementExtensionPoint)) {
    return testMatchPatterns(
      elementExtensionPoint.definition.documentUrlPatterns,
      tabUrl
    );
  }

  return checkAvailable(
    thisTab,
    elementExtensionPoint.definition.isAvailable,
    tabUrl
  );
}

type AvailableDynamic = {
  availableDynamicIds: UUID[];
  unavailableCount: number;
};

const checkAvailableDynamicElements = createAsyncThunk<
  AvailableDynamic,
  void,
  { state: EditorRootState }
>("editor/checkAvailableDynamicElements", async (arg, thunkAPI) => {
  const elements = selectNotDeletedElements(thunkAPI.getState());
  const tabUrl = await getCurrentURL();
  const availableElementIds = await Promise.all(
    elements.map(async ({ uuid, extensionPoint: elementExtensionPoint }) => {
      const isAvailable = await isElementAvailable(
        tabUrl,
        elementExtensionPoint
      );

      return isAvailable ? uuid : null;
    })
  );

  const availableDynamicIds = uniq(compact(availableElementIds));
  const unavailableCount = elements.length - availableDynamicIds.length;

  return { availableDynamicIds, unavailableCount };
});

const checkActiveElementAvailability = createAsyncThunk<
  {
    availableDynamicIds: UUID[];
    unavailableInstalledCount: number;
    unavailableDynamicCount: number;
  },
  void,
  { state: EditorRootState & ExtensionsRootState }
>("editor/checkDynamicElementAvailability", async (arg, thunkAPI) => {
  const tabUrl = await getCurrentURL();
  const state = thunkAPI.getState();
  // Clean (saved, persisted) extensions
  const installedExtensions = selectNotDeletedExtensions(state);
  // Dynamic form state elements for extensions that have been selected in the page editor
  const dynamicElements = selectNotDeletedElements(state);
  // Previously calculated availability for clean extensions
  const { availableInstalledIds } = state.editor;
  // The currently selected element in the page editor
  const activeElement = selectActiveElement(state);
  // Calculate new availability for the active element
  const isAvailable = await isElementAvailable(
    tabUrl,
    activeElement.extensionPoint
  );
  // Calculate the new dynamic element availability, depending on the
  // new availability of the active element -- should be a unique list of ids,
  // and we add/remove the active element's id based on isAvailable
  const availableDynamicIds = [...state.editor.availableDynamicIds];
  if (isAvailable) {
    if (!availableDynamicIds.includes(activeElement.uuid)) {
      availableDynamicIds.push(activeElement.uuid);
    }
  } else {
    pull(availableDynamicIds, activeElement.uuid);
  }

  // Calculate the count of unavailable dynamic elements
  const unavailableDynamicCount =
    dynamicElements.length - availableDynamicIds.length;
  // Find installed extensions that have not been selected yet, i.e. do
  // not have matching dynamic elements -- we need to filter here so that
  // unavailable extensions are not tracked twice in the counts as both an
  // installed extension and a dynamic form element
  const installedNotDynamicIds = differenceBy(
    installedExtensions,
    dynamicElements,
    (extensionOrElement) => {
      if (isExtension(extensionOrElement)) {
        return extensionOrElement.id;
      }

      return extensionOrElement.uuid;
    }
  ).map((extension) => extension.id);
  // Match the filtered installed extensions with their previously calculated availability
  const availableInstalledNotDynamicIds = intersection(
    availableInstalledIds,
    installedNotDynamicIds
  );
  // Calculate the count of unavailable installed extensions that do not
  // have matching dynamic elements
  const unavailableInstalledCount =
    installedNotDynamicIds.length - availableInstalledNotDynamicIds.length;

  return {
    availableDynamicIds,
    unavailableInstalledCount,
    unavailableDynamicCount,
  };
});

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
      state.dirty[element.uuid] = true;

      activateElement(state, element);
    },
    betaError(state) {
      const error = new BusinessError("This feature is in private beta");
      state.error = serializeError(error);
      state.beta = true;
      state.activeElementId = null;
    },
    adapterError(state, action: PayloadAction<{ uuid: UUID; error: unknown }>) {
      const { uuid, error } = action.payload;
      state.error = serializeError(error);
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

      activateElement(state, element);
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
      state.beta = false;
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

      activateElement(state, element);
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
        installed: false, // Can't "reset" this, only remove or save
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
    showCreateRecipeModal(
      state,
      action: PayloadAction<{ keepLocalCopy: boolean }>
    ) {
      state.visibleModalKey = ModalKey.CREATE_RECIPE;
      state.keepLocalCopyOnCreateRecipe = action.payload.keepLocalCopy;
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

      // Make sure the pipeline map is updated
      syncElementNodeUIStates(state, element);

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
      state.dirty[state.activeElementId] = true;
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

      elementUiState.activeNodeId =
        nextActiveNode?.instanceId ?? FOUNDATION_NODE_ID;

      state.dirty[element.uuid] = true;

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
    },
    showAddBlockModal(state, action: PayloadAction<AddBlockLocation>) {
      state.addBlockLocation = action.payload;
      state.visibleModalKey = ModalKey.ADD_BLOCK;
    },
    hideModal(state) {
      state.visibleModalKey = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(checkAvailableInstalledExtensions.pending, (state) => {
        state.isPendingInstalledExtensions = true;
        // We're not resetting the result here so that the old value remains during re-calculation
      })
      .addCase(
        checkAvailableInstalledExtensions.fulfilled,
        (state, { payload: { availableInstalledIds, unavailableCount } }) => {
          state.isPendingInstalledExtensions = false;
          state.availableInstalledIds = availableInstalledIds;
          state.unavailableInstalledCount = unavailableCount;
        }
      )
      .addCase(
        checkAvailableInstalledExtensions.rejected,
        (state, { error }) => {
          state.isPendingInstalledExtensions = false;
          state.unavailableInstalledCount = 0;
          state.error = error;
          reportError(error);
        }
      )
      .addCase(checkAvailableDynamicElements.pending, (state) => {
        state.isPendingDynamicExtensions = true;
        // We're not resetting the result here so that the old value remains during re-calculation
      })
      .addCase(
        checkAvailableDynamicElements.fulfilled,
        (state, { payload: { availableDynamicIds, unavailableCount } }) => {
          state.isPendingDynamicExtensions = false;
          state.availableDynamicIds = availableDynamicIds;
          state.unavailableDynamicCount = unavailableCount;
        }
      )
      .addCase(checkAvailableDynamicElements.rejected, (state, { error }) => {
        state.isPendingDynamicExtensions = false;
        state.unavailableDynamicCount = 0;
        state.error = error;
        reportError(error);
      })
      .addCase(
        checkActiveElementAvailability.fulfilled,
        (
          state,
          {
            payload: {
              availableDynamicIds,
              unavailableDynamicCount,
              unavailableInstalledCount,
            },
          }
        ) => ({
          ...state,
          availableDynamicIds,
          unavailableDynamicCount,
          unavailableInstalledCount,
        })
      );
  },
});
/* eslint-enable security/detect-object-injection */

export const actions = {
  ...editorSlice.actions,
  cloneActiveExtension,
  checkAvailableInstalledExtensions,
  checkAvailableDynamicElements,
  checkActiveElementAvailability,
};

export const persistEditorConfig = {
  key: "editor",
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 1,
};
