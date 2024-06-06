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

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { clearExtensionTraces } from "@/telemetry/trace";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { type BrickConfig } from "@/bricks/types";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import {
  type AddBlockLocation,
  type EditorRootState,
  type EditorState,
  ModalKey,
  type ModMetadataFormState,
} from "@/pageEditor/pageEditorTypes";
import { uuidv4 } from "@/types/helpers";
import { cloneDeep, compact, get, pull, uniq } from "lodash";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { type TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { getInvalidPath } from "@/utils/debugUtils";
import {
  selectActiveModComponentFormState,
  selectActiveModComponentUIState,
  selectActiveNodeUIState,
  selectNotDeletedModComponentFormStates,
  selectNotDeletedActivatedModComponents,
} from "./editorSelectors";
import {
  isQuickBarExtensionPoint,
  type ModComponentFormState,
} from "@/pageEditor/starterBricks/formStateTypes";
import reportError from "@/telemetry/reportError";
import {
  activateElement,
  editRecipeMetadata,
  editRecipeOptionsDefinitions,
  ensureElementUIState,
  removeElement,
  removeRecipeData,
  selectRecipeId,
  setActiveNodeId,
  syncElementNodeUIStates,
} from "@/pageEditor/slices/editorSliceHelpers";
import { type Draft, produce } from "immer";
import { normalizePipelineForEditor } from "@/pageEditor/starterBricks/pipelineMapping";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import {
  getInstalledExtensionPoints,
  checkAvailable,
} from "@/contentScript/messenger/api";
import { resolveExtensionInnerDefinitions } from "@/registry/internal";
import { QuickBarStarterBrickABC } from "@/starterBricks/quickBar/quickBarExtension";
import { testMatchPatterns } from "@/bricks/available";
import { BusinessError } from "@/errors/businessErrors";
import { serializeError } from "serialize-error";
import { type StorageInterface } from "@/store/StorageInterface";
import { localStorage } from "redux-persist-webextension-storage";
import { removeUnusedDependencies } from "@/components/fields/schemaFields/integrations/integrationDependencyFieldUtils";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { createMigrate } from "redux-persist";
import { migrations } from "@/store/editorMigrations";
import { type BaseExtensionPointState } from "@/pageEditor/baseFormStateTypes";
import {
  getCurrentInspectedURL,
  inspectedTab,
} from "@/pageEditor/context/connection";
import { assertNotNullish } from "@/utils/nullishUtils";

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
  isBetaUI: false,
  elementUIStates: {},
  dirtyRecipeOptionsById: {},
  dirtyRecipeMetadataById: {},
  visibleModalKey: null,
  keepLocalCopyOnCreateRecipe: false,
  deletedElementsByRecipeId: {},
  availableInstalledIds: [],
  isPendingInstalledExtensions: false,
  availableDynamicIds: [],
  isPendingDynamicExtensions: false,
  isModListExpanded: true,
  isDataPanelExpanded: true,
  isDimensionsWarningDismissed: false,

  // Not persisted
  inserting: null,
  isVariablePopoverVisible: false,
};

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

const cloneActiveExtension = createAsyncThunk<
  void,
  void,
  { state: EditorRootState }
>("editor/cloneActiveExtension", async (arg, thunkAPI) => {
  const state = thunkAPI.getState();
  const newActiveModComponentFormState = await produce(
    selectActiveModComponentFormState(state),
    async (draft) => {
      assertNotNullish(draft, "Active mod component form state not found");
      draft.uuid = uuidv4();
      draft.label += " (Copy)";
      // Remove from its recipe, if any (the user can add it to any recipe after creation)
      delete draft.recipe;
      // Re-generate instance IDs for all the bricks in the extension
      draft.extension.blockPipeline = await normalizePipelineForEditor(
        draft.extension.blockPipeline,
      );
    },
  );
  assertNotNullish(
    newActiveModComponentFormState,
    "New active mod component form state not found",
  );
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- Add the cloned extension
  thunkAPI.dispatch(actions.addElement(newActiveModComponentFormState));
});

type AvailableInstalled = {
  availableInstalledIds: UUID[];
};

const checkAvailableInstalledExtensions = createAsyncThunk<
  AvailableInstalled,
  void,
  { state: EditorRootState & ModComponentsRootState }
>("editor/checkAvailableInstalledExtensions", async (arg, thunkAPI) => {
  const notDeletedFormStates = selectNotDeletedModComponentFormStates(
    thunkAPI.getState(),
  );
  const notDeletedModComponents = selectNotDeletedActivatedModComponents(
    thunkAPI.getState(),
  );
  const starterBricks = await getInstalledExtensionPoints(inspectedTab);
  const activatedStarterBricks = new Map(
    starterBricks.map((starterBrick) => [starterBrick.id, starterBrick]),
  );
  const resolved = await Promise.all(
    notDeletedModComponents.map(async (modComponent) =>
      resolveExtensionInnerDefinitions(modComponent),
    ),
  );
  const tabUrl = await getCurrentInspectedURL();
  const availableExtensionPointIds = resolved
    .filter((x) => {
      const activatedStarterBrick = activatedStarterBricks.get(
        x.extensionPointId,
      );
      // Not installed means not available
      if (activatedStarterBrick == null) {
        return false;
      }

      // QuickBar is installed on every page, need to filter by the documentUrlPatterns
      if (
        QuickBarStarterBrickABC.isQuickBarExtensionPoint(activatedStarterBrick)
      ) {
        return testMatchPatterns(
          activatedStarterBrick.documentUrlPatterns,
          tabUrl,
        );
      }

      return true;
    })
    .map((x) => x.id);

  // Note: we can take out this filter if and when we persist the editor
  // slice and remove installed mod components when they become dynamic form states
  const notDynamicInstalled = notDeletedModComponents.filter(
    (modComponent) =>
      !notDeletedFormStates.some((element) => element.uuid === modComponent.id),
  );

  const availableInstalledIds = notDynamicInstalled
    .filter((x) => availableExtensionPointIds.includes(x.id))
    .map((x) => x.id);

  return { availableInstalledIds };
});

async function isElementAvailable(
  tabUrl: string,
  elementExtensionPoint: BaseExtensionPointState,
): Promise<boolean> {
  if (isQuickBarExtensionPoint(elementExtensionPoint)) {
    return testMatchPatterns(
      elementExtensionPoint.definition.documentUrlPatterns,
      tabUrl,
    );
  }

  return checkAvailable(
    inspectedTab,
    elementExtensionPoint.definition.isAvailable,
    tabUrl,
  );
}

type AvailableDynamic = {
  availableDynamicIds: UUID[];
};

const checkAvailableDynamicElements = createAsyncThunk<
  AvailableDynamic,
  void,
  { state: EditorRootState }
>("editor/checkAvailableDynamicElements", async (arg, thunkAPI) => {
  const notDeletedFormStates = selectNotDeletedModComponentFormStates(
    thunkAPI.getState(),
  );
  const tabUrl = await getCurrentInspectedURL();
  const availableFormStateIds = await Promise.all(
    notDeletedFormStates.map(
      async ({ uuid, extensionPoint: formStateStarterBrick }) => {
        const isAvailable = await isElementAvailable(
          tabUrl,
          formStateStarterBrick,
        );

        return isAvailable ? uuid : null;
      },
    ),
  );

  const availableDynamicIds = uniq(compact(availableFormStateIds));

  return { availableDynamicIds };
});

const checkActiveElementAvailability = createAsyncThunk<
  {
    availableDynamicIds: UUID[];
  },
  void,
  { state: EditorRootState & ModComponentsRootState }
>("editor/checkDynamicElementAvailability", async (arg, thunkAPI) => {
  const tabUrl = await getCurrentInspectedURL();
  const state = thunkAPI.getState();
  // The currently selected element in the page editor
  const activeModComponentFormState = selectActiveModComponentFormState(state);
  assertNotNullish(
    activeModComponentFormState,
    "Active mod component form state not found",
  );
  // Calculate new availability for the active element
  const isAvailable = await isElementAvailable(
    tabUrl,
    activeModComponentFormState.extensionPoint,
  );
  // Calculate the new dynamic element availability, depending on the
  // new availability of the active element -- should be a unique list of ids,
  // and we add/remove the active element's id based on isAvailable
  const availableDynamicIds = [...state.editor.availableDynamicIds];
  if (isAvailable) {
    if (!availableDynamicIds.includes(activeModComponentFormState.uuid)) {
      availableDynamicIds.push(activeModComponentFormState.uuid);
    }
  } else {
    pull(availableDynamicIds, activeModComponentFormState.uuid);
  }

  return {
    availableDynamicIds,
  };
});

export const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    resetEditor() {
      return initialState;
    },
    toggleInsert(state, action: PayloadAction<StarterBrickType | null>) {
      state.inserting = action.payload;
      state.beta = false;
      state.error = null;
    },
    markEditable(state, action: PayloadAction<RegistryId>) {
      state.knownEditable.push(action.payload);
    },
    addElement(state, action: PayloadAction<ModComponentFormState>) {
      const element = action.payload as Draft<ModComponentFormState>;
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
    selectInstalled(state, action: PayloadAction<ModComponentFormState>) {
      const element = action.payload as Draft<ModComponentFormState>;
      const index = state.elements.findIndex((x) => x.uuid === element.uuid);
      if (index >= 0) {
        state.elements[index] = element;
      } else {
        state.elements.push(element);
      }

      activateElement(state, element);
    },
    resetInstalled(state, actions: PayloadAction<ModComponentFormState>) {
      const element = actions.payload as Draft<ModComponentFormState>;
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
    showHomePane(state) {
      state.activeElementId = null;
      state.activeRecipeId = null;
      state.expandedRecipeId = null;
      state.error = null;
      state.beta = false;
      state.selectionSeq++;
    },
    selectElement(state, action: PayloadAction<UUID>) {
      const elementId = action.payload;
      const element = state.elements.find((x) => x.uuid === elementId);
      if (!element) {
        throw new Error(`Unknown dynamic element: ${action.payload}`);
      }

      activateElement(state, element);
    },
    markClean(state, action: PayloadAction<UUID>) {
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
    editElement(state, action: PayloadAction<ModComponentFormState>) {
      const element = action.payload;
      const index = state.elements.findIndex((x) => x.uuid === element.uuid);
      if (index < 0) {
        throw new Error(`Unknown dynamic element: ${element.uuid}`);
      }

      state.elements[index] = element as Draft<ModComponentFormState>;
      state.dirty[element.uuid] = true;

      syncElementNodeUIStates(state, element);
    },
    /**
     * Applies the update to the element
     */
    updateElement(
      state,
      action: PayloadAction<{ uuid: UUID } & Partial<ModComponentFormState>>,
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
    setElementActiveNodeId(state, action: PayloadAction<UUID>) {
      setActiveNodeId(state, action.payload);
    },
    setNodeDataPanelTabSelected(state, action: PayloadAction<DataPanelTabKey>) {
      const nodeUIState = validateNodeUIState(state);
      nodeUIState.dataPanel.activeTabKey = action.payload;
    },

    /**
     * Updates the query on a DataPane tab with the JsonTree component
     */
    setNodeDataPanelTabSearchQuery(
      state,
      action: PayloadAction<{ tabKey: DataPanelTabKey; query: string }>,
    ) {
      const { tabKey, query } = action.payload;

      const nodeUIState = validateNodeUIState(state);

      nodeUIState.dataPanel[tabKey].query = query;
    },

    /**
     * Updates the expanded state of the JsonTree component on a DataPanel tab
     */
    setNodeDataPanelTabExpandedState(
      state,
      action: PayloadAction<{
        tabKey: DataPanelTabKey;
        expandedState: TreeExpandedState;
      }>,
    ) {
      const { tabKey, expandedState } = action.payload;
      const nodeUIState = validateNodeUIState(state);
      nodeUIState.dataPanel[tabKey].treeExpandedState = expandedState;
    },

    /**
     * Updates the active element of a Document or Form builder on the Preview tab
     */
    setNodePreviewActiveElement(state, action: PayloadAction<string | null>) {
      const activeElement = action.payload;
      const nodeUIState = validateNodeUIState(state);

      nodeUIState.dataPanel[DataPanelTabKey.Preview].activeElement =
        activeElement;

      nodeUIState.dataPanel[DataPanelTabKey.Outline].activeElement =
        activeElement;
    },

    copyBlockConfig(state, action: PayloadAction<BrickConfig>) {
      const copy = { ...action.payload };
      delete copy.instanceId;
      state.copiedBlock = copy;
    },
    clearCopiedBlockConfig(state) {
      delete state.copiedBlock;
    },
    editRecipeOptionsDefinitions(
      state,
      action: PayloadAction<ModOptionsDefinition>,
    ) {
      const { payload: options } = action;
      editRecipeOptionsDefinitions(state, options);
    },
    editRecipeMetadata(state, action: PayloadAction<ModMetadataFormState>) {
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
      action: PayloadAction<ModComponentBase["_recipe"]>,
    ) {
      const metadata = action.payload;
      const recipeElements = state.elements.filter(
        (element) => element.recipe?.id === metadata?.id,
      );
      for (const element of recipeElements) {
        element.recipe = metadata;
      }
    },
    showAddToRecipeModal(state) {
      state.visibleModalKey = ModalKey.ADD_TO_MOD;
    },
    addElementToRecipe(
      state,
      action: PayloadAction<{
        elementId: UUID;
        recipeMetadata: ModComponentBase["_recipe"];
        keepLocalCopy: boolean;
      }>,
    ) {
      const {
        payload: { elementId, recipeMetadata, keepLocalCopy },
      } = action;
      const elementIndex = state.elements.findIndex(
        (element) => element.uuid === elementId,
      );
      if (elementIndex < 0) {
        throw new Error(
          "Unable to add extension to mod, extension form state not found",
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- index check
      const element = state.elements[elementIndex]!;

      const newId = uuidv4();
      state.elements.push({
        ...element,
        uuid: newId,
        recipe: recipeMetadata,
        installed: false, // Can't "reset" this, only remove or save
      });
      state.dirty[newId] = true;

      state.expandedRecipeId = recipeMetadata?.id ?? null;

      if (!keepLocalCopy) {
        ensureElementUIState(state, newId);
        state.activeElementId = newId;
        state.elements.splice(elementIndex, 1);
        if (element?.uuid) {
          delete state.dirty[element.uuid];
          delete state.elementUIStates[element.uuid];
        }
      }
    },
    showRemoveFromRecipeModal(state) {
      state.visibleModalKey = ModalKey.REMOVE_FROM_MOD;
    },
    removeElementFromRecipe(
      state,
      action: PayloadAction<{
        elementId: UUID;
        keepLocalCopy: boolean;
      }>,
    ) {
      const { elementId, keepLocalCopy } = action.payload;
      const elementIndex = state.elements.findIndex(
        (element) => element.uuid === elementId,
      );
      if (elementIndex < 0) {
        throw new Error(
          "Unable to remove mod component from mod, mod component form state not found",
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- index check above
      const element = state.elements[elementIndex]!;
      assertNotNullish(element.recipe, "Element has no recipe");
      const recipeId = element.recipe.id;
      state.deletedElementsByRecipeId[recipeId] ??= [];

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- nullish assignment above
      state.deletedElementsByRecipeId[recipeId]!.push(element);
      state.elements.splice(elementIndex, 1);
      delete state.dirty[elementId];
      delete state.elementUIStates[elementId];
      state.activeElementId = null;

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
      state.visibleModalKey = ModalKey.SAVE_AS_NEW_MOD;
    },
    clearDeletedElementsForRecipe(state, action: PayloadAction<RegistryId>) {
      const recipeId = action.payload;
      delete state.deletedElementsByRecipeId[recipeId];
    },
    restoreDeletedElementsForRecipe(state, action: PayloadAction<RegistryId>) {
      const recipeId = action.payload;
      const deletedElements = state.deletedElementsByRecipeId[recipeId];
      if (deletedElements?.length) {
        state.elements.push(...deletedElements);
        for (const elementId of deletedElements.map(
          (element) => element.uuid,
        )) {
          state.dirty[elementId] = false;
          ensureElementUIState(state, elementId);
        }

        delete state.deletedElementsByRecipeId[recipeId];
      }
    },
    removeRecipeData(state, action: PayloadAction<RegistryId>) {
      const recipeId = action.payload;
      removeRecipeData(state, recipeId);
    },
    showCreateRecipeModal(
      state,
      action: PayloadAction<{ keepLocalCopy: boolean }>,
    ) {
      state.visibleModalKey = ModalKey.CREATE_MOD;
      state.keepLocalCopyOnCreateRecipe = action.payload.keepLocalCopy;
    },
    addNode(
      state,
      action: PayloadAction<{
        block: BrickConfig;
        pipelinePath: string;
        pipelineIndex: number;
      }>,
    ) {
      const { block, pipelinePath, pipelineIndex } = action.payload;

      const element = state.elements.find(
        (x) => x.uuid === state.activeElementId,
      );

      assertNotNullish(
        element,
        `Active element not found for id: ${state.activeElementId}`,
      );

      const pipeline: unknown[] | null = get(element, pipelinePath);
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
      assertNotNullish(block.instanceId, "Block instanceId not found");
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
      }>,
    ) {
      const { nodeId, direction } = action.payload;
      const activeModComponentFormState = selectActiveModComponentFormState({
        editor: state,
      });
      assertNotNullish(
        activeModComponentFormState,
        "Active mod component form state not found",
      );

      const activeModComponentUiState = selectActiveModComponentUIState({
        editor: state,
      });
      const node = activeModComponentUiState?.pipelineMap[nodeId];
      assertNotNullish(node, `Node not found in pipeline map: ${nodeId}`);
      const { pipelinePath, index } = node;
      const pipeline = get(activeModComponentFormState, pipelinePath);

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
      syncElementNodeUIStates(state, activeModComponentFormState);

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
      const activeElementId = validateActiveElementId(state);
      state.dirty[activeElementId] = true;
    },
    removeNode(state, action: PayloadAction<UUID>) {
      const nodeIdToRemove = action.payload;
      const activeModComponentFormState = selectActiveModComponentFormState({
        editor: state,
      });
      assertNotNullish(
        activeModComponentFormState,
        "Active mod component form state not found",
      );

      const activeModComponentUiState = selectActiveModComponentUIState({
        editor: state,
      });
      assertNotNullish(
        activeModComponentUiState,
        "Active mod component UI state not found",
      );
      const node = activeModComponentUiState.pipelineMap[nodeIdToRemove];
      assertNotNullish(
        node,
        `Node not found in pipeline map: ${nodeIdToRemove}`,
      );
      const { pipelinePath, index } = node;
      const pipeline: BrickConfig[] = get(
        activeModComponentFormState,
        pipelinePath,
      );

      // TODO: this fails when the brick is the last in a pipeline, need to select parent node
      const nextActiveNode =
        index + 1 === pipeline.length
          ? pipeline[index - 1] // Last item, select previous
          : pipeline[index + 1]; // Not last item, select next
      pipeline.splice(index, 1);

      removeUnusedDependencies(activeModComponentFormState);

      syncElementNodeUIStates(state, activeModComponentFormState);

      activeModComponentUiState.activeNodeId =
        nextActiveNode?.instanceId ?? FOUNDATION_NODE_ID;

      state.dirty[activeModComponentFormState.uuid] = true;

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
    },
    showAddBlockModal(state, action: PayloadAction<AddBlockLocation>) {
      state.addBlockLocation = action.payload;
      state.visibleModalKey = ModalKey.ADD_BRICK;
    },
    hideModal(state) {
      state.visibleModalKey = null;
    },
    hideModalIfShowing(state, action: PayloadAction<ModalKey>) {
      if (state.visibleModalKey === action.payload) {
        state.visibleModalKey = null;
      }
    },
    editRecipeOptionsValues(state, action: PayloadAction<OptionsArgs>) {
      const recipeId = state.activeRecipeId;
      if (recipeId == null) {
        return;
      }

      const notDeletedFormStates = selectNotDeletedModComponentFormStates({
        editor: state,
      });
      const modFormStates = notDeletedFormStates.filter(
        (formState) => formState.recipe?.id === recipeId,
      );
      for (const formState of modFormStates) {
        formState.optionsArgs = action.payload;
        state.dirty[formState.uuid] = true;
      }
    },
    setExpandedFieldSections(
      state,
      { payload }: PayloadAction<{ id: string; isExpanded: boolean }>,
    ) {
      const uiState = selectActiveNodeUIState({
        editor: state,
      });
      assertNotNullish(uiState, "Active node UI state not found");

      if (uiState.expandedFieldSections === undefined) {
        uiState.expandedFieldSections = {};
      }

      const { id, isExpanded } = payload;
      uiState.expandedFieldSections[id] = isExpanded;
    },
    expandBrickPipelineNode(state, action: PayloadAction<UUID>) {
      const nodeId = action.payload;
      const elementUIState = validateElementUIState(state);
      const nodeUIState = elementUIState.nodeUIStates[nodeId];
      assertNotNullish(
        nodeUIState,
        `Node UI state not found for id: ${nodeId}`,
      );
      nodeUIState.collapsed = false;
    },
    toggleCollapseBrickPipelineNode(state, action: PayloadAction<UUID>) {
      const nodeId = action.payload;
      const elementUIState = validateElementUIState(state);
      const nodeUIState = elementUIState.nodeUIStates[nodeId];
      assertNotNullish(
        nodeUIState,
        `Node UI state not found for id: ${nodeId}`,
      );
      nodeUIState.collapsed = !nodeUIState.collapsed;
    },
    setDataSectionExpanded(
      state,
      { payload }: PayloadAction<{ isExpanded: boolean }>,
    ) {
      state.isDataPanelExpanded = payload.isExpanded;
    },
    setModListExpanded(
      state,
      { payload }: PayloadAction<{ isExpanded: boolean }>,
    ) {
      state.isModListExpanded = payload.isExpanded;
    },
    /**
     * Mark that the variable popover is showing.
     */
    showVariablePopover(state) {
      state.isVariablePopoverVisible = true;
    },
    /**
     * Mark that the variable popover is not showing.
     */
    hideVariablePopover(state) {
      state.isVariablePopoverVisible = false;
    },
    dismissDimensionsWarning(state) {
      state.isDimensionsWarningDismissed = true;
    },
    showSaveDataIntegrityErrorModal(state) {
      state.visibleModalKey = ModalKey.SAVE_DATA_INTEGRITY_ERROR;
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
        (state, { payload: { availableInstalledIds } }) => {
          state.isPendingInstalledExtensions = false;
          state.availableInstalledIds = availableInstalledIds;
        },
      )
      .addCase(
        checkAvailableInstalledExtensions.rejected,
        (state, { error }) => {
          state.isPendingInstalledExtensions = false;
          state.error = error;
          reportError(error);
        },
      )
      .addCase(checkAvailableDynamicElements.pending, (state) => {
        state.isPendingDynamicExtensions = true;
        // We're not resetting the result here so that the old value remains during re-calculation
      })
      .addCase(
        checkAvailableDynamicElements.fulfilled,
        (state, { payload: { availableDynamicIds } }) => {
          state.isPendingDynamicExtensions = false;
          state.availableDynamicIds = availableDynamicIds;
        },
      )
      .addCase(checkAvailableDynamicElements.rejected, (state, { error }) => {
        state.isPendingDynamicExtensions = false;
        state.error = error;
        reportError(error);
      })
      .addCase(
        checkActiveElementAvailability.fulfilled,
        (state, { payload: { availableDynamicIds } }) => ({
          ...state,
          availableDynamicIds,
        }),
      );
  },
});
/* eslint-enable security/detect-object-injection  */

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
  version: 2,
  migrate: createMigrate(migrations, { debug: Boolean(process.env.DEBUG) }),
  blacklist: [
    "inserting",
    "isVarPopoverVisible",
    "isSaveDataIntegrityErrorModalVisible",
  ],
};

function validateActiveElementId(state: Draft<EditorState>) {
  const { activeElementId } = state;
  assertNotNullish(activeElementId, "Active element not found");

  return activeElementId;
}

function validateElementUIState(state: Draft<EditorState>) {
  const elementUIState = state.elementUIStates[validateActiveElementId(state)];

  assertNotNullish(
    elementUIState,
    `Element UI state not found for activeElementId: ${state.activeElementId}`,
  );

  return elementUIState;
}

function validateNodeUIState(state: Draft<EditorState>) {
  const elementUIState = validateElementUIState(state);

  const nodeUIState = elementUIState.nodeUIStates[elementUIState.activeNodeId];

  assertNotNullish(
    nodeUIState,
    `Node UI state not found for activeNodeId: ${elementUIState.activeNodeId}`,
  );
  return nodeUIState;
}
