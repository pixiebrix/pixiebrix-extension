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
  type AddBrickLocation,
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
  setActiveModComponentId,
  editRecipeMetadata,
  editRecipeOptionsDefinitions,
  ensureBrickPipelineUIState,
  removeModComponentFormState,
  removeModData,
  setActiveModId,
  setActiveNodeId,
  syncNodeUIStates,
} from "@/pageEditor/slices/editorSliceHelpers";
import { type Draft, produce } from "immer";
import { normalizePipelineForEditor } from "@/pageEditor/starterBricks/pipelineMapping";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import {
  getInstalledExtensionPoints,
  checkAvailable,
} from "@/contentScript/messenger/api";
import { hydrateModComponentInnerDefinitions } from "@/registry/hydrateInnerDefinitions";
import { QuickBarStarterBrickABC } from "@/starterBricks/quickBar/quickBarStarterBrick";
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
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  beta: false,
  modComponentFormStates: [],
  knownEditableBrickIds: [],
  dirty: {},
  isBetaUI: false,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModalKey: null,
  keepLocalCopyOnCreateMod: false,
  deletedModComponentFormStatesByModId: {},
  availableActivatedModComponentIds: [],
  isPendingAvailableActivatedModComponents: false,
  availableDraftModComponentIds: [],
  isPendingDraftModComponents: false,
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
  thunkAPI.dispatch(
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- Add the cloned extension
    actions.addModComponentFormState(newActiveModComponentFormState),
  );
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
      hydrateModComponentInnerDefinitions(modComponent),
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
        QuickBarStarterBrickABC.isQuickBarStarterBrick(activatedStarterBrick)
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
  // slice and remove installed mod components when they become draft form states
  const notDraftActivated = notDeletedModComponents.filter(
    (modComponent) =>
      !notDeletedFormStates.some(
        (modComponentFormState) =>
          modComponentFormState.uuid === modComponent.id,
      ),
  );

  const availableInstalledIds = notDraftActivated
    .filter((x) => availableExtensionPointIds.includes(x.id))
    .map((x) => x.id);

  return { availableInstalledIds };
});

async function isStarterBrickFormStateAvailable(
  tabUrl: string,
  starterBrickFormState: BaseExtensionPointState,
): Promise<boolean> {
  if (isQuickBarExtensionPoint(starterBrickFormState)) {
    return testMatchPatterns(
      starterBrickFormState.definition.documentUrlPatterns,
      tabUrl,
    );
  }

  return checkAvailable(
    inspectedTab,
    starterBrickFormState.definition.isAvailable,
    tabUrl,
  );
}

type AvailableDraftModComponentIds = {
  availableDraftModComponentIds: UUID[];
};

const checkAvailableDraftModComponents = createAsyncThunk<
  AvailableDraftModComponentIds,
  void,
  { state: EditorRootState }
>("editor/checkAvailableDraftModComponentFormStates", async (arg, thunkAPI) => {
  const notDeletedFormStates = selectNotDeletedModComponentFormStates(
    thunkAPI.getState(),
  );
  const tabUrl = await getCurrentInspectedURL();
  const availableFormStateIds = await Promise.all(
    notDeletedFormStates.map(
      async ({ uuid, extensionPoint: formStateStarterBrick }) => {
        const isAvailable = await isStarterBrickFormStateAvailable(
          tabUrl,
          formStateStarterBrick,
        );

        return isAvailable ? uuid : null;
      },
    ),
  );

  const availableDraftModComponentIds = uniq(compact(availableFormStateIds));

  return { availableDraftModComponentIds };
});

const checkActiveModComponentAvailability = createAsyncThunk<
  {
    availableDraftModComponentIds: UUID[];
  },
  void,
  { state: EditorRootState & ModComponentsRootState }
>("editor/checkActiveModComponentAvailability", async (arg, thunkAPI) => {
  const tabUrl = await getCurrentInspectedURL();
  const state = thunkAPI.getState();
  // The form state of the currently selected mod component in the page editor
  const activeModComponentFormState = selectActiveModComponentFormState(state);
  assertNotNullish(
    activeModComponentFormState,
    "Active mod component form state not found",
  );
  // Calculate new availability for the active mod component
  const isAvailable = await isStarterBrickFormStateAvailable(
    tabUrl,
    activeModComponentFormState.extensionPoint,
  );
  // Calculate the new draft mod component availability, depending on the
  // new availability of the active mod component -- should be a unique list of ids,
  // and we add/remove the active mod component's id based on isAvailable
  const availableDraftModComponentIds = [
    ...state.editor.availableDraftModComponentIds,
  ];
  if (isAvailable) {
    if (
      !availableDraftModComponentIds.includes(activeModComponentFormState.uuid)
    ) {
      availableDraftModComponentIds.push(activeModComponentFormState.uuid);
    }
  } else {
    pull(availableDraftModComponentIds, activeModComponentFormState.uuid);
  }

  return {
    availableDraftModComponentIds,
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
      state.knownEditableBrickIds.push(action.payload);
    },
    addModComponentFormState(
      state,
      action: PayloadAction<ModComponentFormState>,
    ) {
      const modComponentFormState =
        action.payload as Draft<ModComponentFormState>;
      state.inserting = null;
      state.modComponentFormStates.push(modComponentFormState);
      state.dirty[modComponentFormState.uuid] = true;

      setActiveModComponentId(state, modComponentFormState);
    },
    betaError(state) {
      const error = new BusinessError("This feature is in private beta");
      state.error = serializeError(error);
      state.beta = true;
      state.activeModComponentId = null;
    },
    adapterError(state, action: PayloadAction<{ uuid: UUID; error: unknown }>) {
      const { uuid, error } = action.payload;
      state.error = serializeError(error);
      state.beta = false;
      state.activeModComponentId = uuid;
      state.selectionSeq++;
    },
    selectInstalled(state, action: PayloadAction<ModComponentFormState>) {
      const modComponentFormState =
        action.payload as Draft<ModComponentFormState>;
      const index = state.modComponentFormStates.findIndex(
        (x) => x.uuid === modComponentFormState.uuid,
      );
      if (index >= 0) {
        state.modComponentFormStates[index] = modComponentFormState;
      } else {
        state.modComponentFormStates.push(modComponentFormState);
      }

      setActiveModComponentId(state, modComponentFormState);
    },
    resetInstalled(state, actions: PayloadAction<ModComponentFormState>) {
      const modComponentFormState =
        actions.payload as Draft<ModComponentFormState>;
      const index = state.modComponentFormStates.findIndex(
        (x) => x.uuid === modComponentFormState.uuid,
      );
      if (index >= 0) {
        state.modComponentFormStates[index] = modComponentFormState;
      } else {
        state.modComponentFormStates.push(modComponentFormState);
      }

      state.dirty[modComponentFormState.uuid] = false;
      state.error = null;
      state.beta = false;
      state.selectionSeq++;

      // Make sure we're not keeping any private data around from Page Editor sessions
      void clearExtensionTraces(modComponentFormState.uuid);

      syncNodeUIStates(state, modComponentFormState);
    },
    showHomePane(state) {
      state.activeModComponentId = null;
      state.activeModId = null;
      state.expandedModId = null;
      state.error = null;
      state.beta = false;
      state.selectionSeq++;
    },
    setActiveModComponentId(state, action: PayloadAction<UUID>) {
      const modComponentId = action.payload;
      const modComponentFormState = state.modComponentFormStates.find(
        (x) => x.uuid === modComponentId,
      );
      if (!modComponentFormState) {
        throw new Error(`Unknown draft mod component: ${action.payload}`);
      }

      setActiveModComponentId(state, modComponentFormState);
    },
    markClean(state, action: PayloadAction<UUID>) {
      const modComponentFormState = state.modComponentFormStates.find(
        (x) => action.payload === x.uuid,
      );
      if (!modComponentFormState) {
        throw new Error(`Unknown draft mod component: ${action.payload}`);
      }

      if (!modComponentFormState.installed) {
        state.knownEditableBrickIds.push(
          modComponentFormState.extensionPoint.metadata.id,
        );
      }

      modComponentFormState.installed = true;
      state.dirty[modComponentFormState.uuid] = false;
      // Force a reload so the _new flags are correct on the readers
      state.selectionSeq++;
    },
    /**
     * Sync the formik mod component form state in the Page Editor with redux.
     */
    syncModComponentFormState(
      state,
      action: PayloadAction<ModComponentFormState>,
    ) {
      const modComponentFormState = action.payload;
      const index = state.modComponentFormStates.findIndex(
        (x) => x.uuid === modComponentFormState.uuid,
      );
      if (index < 0) {
        throw new Error(
          `Unknown draft mod component: ${modComponentFormState.uuid}`,
        );
      }

      state.modComponentFormStates[index] =
        modComponentFormState as Draft<ModComponentFormState>;
      state.dirty[modComponentFormState.uuid] = true;

      syncNodeUIStates(state, modComponentFormState);
    },
    partialUpdateModComponentFormState(
      state,
      action: PayloadAction<{ uuid: UUID } & Partial<ModComponentFormState>>,
    ) {
      const { uuid, ...propertiesToUpdate } = action.payload;
      const index = state.modComponentFormStates.findIndex(
        (x) => x.uuid === uuid,
      );
      if (index < 0) {
        throw new Error(`Unknown draft mod component: ${uuid}`);
      }

      // @ts-expect-error -- Concrete variants of FromState are not mutually assignable.
      state.modComponentFormStates[index] = {
        ...state.modComponentFormStates.at(index),
        ...propertiesToUpdate,
      };

      // Force reload of Formik state
      state.selectionSeq++;
    },
    removeModComponentFormState(state, action: PayloadAction<UUID>) {
      const modComponentId = action.payload;
      removeModComponentFormState(state, modComponentId);
    },
    setActiveModId(state, action: PayloadAction<RegistryId>) {
      const modId = action.payload;
      setActiveModId(state, modId);
    },
    setBetaUIEnabled(state, action: PayloadAction<boolean>) {
      state.isBetaUI = action.payload;
    },
    setActiveNodeId(state, action: PayloadAction<UUID>) {
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
    setActiveDocumentOrFormPreviewElement(
      state,
      action: PayloadAction<string | null>,
    ) {
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
      state.copiedBrick = copy;
    },
    clearCopiedBrickConfig(state) {
      delete state.copiedBrick;
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
      delete state.dirtyModMetadataById[recipeId];
      delete state.dirtyModOptionsById[recipeId];
    },
    updateModMetadataOnModComponentFormStates(
      state,
      action: PayloadAction<ModComponentBase["_recipe"]>,
    ) {
      const modMetadata = action.payload;
      const modComponentFormStates = state.modComponentFormStates.filter(
        (modComponentFormState) =>
          modComponentFormState.recipe?.id === modMetadata?.id,
      );
      for (const formState of modComponentFormStates) {
        formState.recipe = modMetadata;
      }
    },
    showAddToRecipeModal(state) {
      state.visibleModalKey = ModalKey.ADD_TO_MOD;
    },
    addModComponentFormStateToMod(
      state,
      action: PayloadAction<{
        modComponentId: UUID;
        modMetadata: ModComponentBase["_recipe"];
        keepLocalCopy: boolean;
      }>,
    ) {
      const {
        payload: { modComponentId, modMetadata, keepLocalCopy },
      } = action;
      const modComponentFormStateIndex = state.modComponentFormStates.findIndex(
        (x) => x.uuid === modComponentId,
      );
      if (modComponentFormStateIndex < 0) {
        throw new Error(
          "Unable to add mod component to mod, mod component form state not found",
        );
      }

      const modComponentFormState =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- length check above
        state.modComponentFormStates[modComponentFormStateIndex]!;

      const newId = uuidv4();
      state.modComponentFormStates.push({
        ...modComponentFormState,
        uuid: newId,
        recipe: modMetadata,
        installed: false, // Can't "reset" this, only remove or save
      });
      state.dirty[newId] = true;

      state.expandedModId = modMetadata?.id ?? null;

      if (!keepLocalCopy) {
        ensureBrickPipelineUIState(state, newId);
        state.activeModComponentId = newId;
        state.modComponentFormStates.splice(modComponentFormStateIndex, 1);
        if (modComponentFormState?.uuid) {
          delete state.dirty[modComponentFormState.uuid];
          delete state.brickPipelineUIStateById[modComponentFormState.uuid];
        }
      }
    },
    showRemoveFromRecipeModal(state) {
      state.visibleModalKey = ModalKey.REMOVE_FROM_MOD;
    },
    removeModComponentFormStateFromMod(
      state,
      action: PayloadAction<{
        elementId: UUID;
        keepLocalCopy: boolean;
      }>,
    ) {
      const { elementId, keepLocalCopy } = action.payload;
      const modComponentFormStateIndex = state.modComponentFormStates.findIndex(
        (x) => x.uuid === elementId,
      );
      if (modComponentFormStateIndex < 0) {
        throw new Error(
          "Unable to remove mod component from mod, mod component form state not found",
        );
      }

      const modComponentFormState =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- length check above
        state.modComponentFormStates[modComponentFormStateIndex]!;
      assertNotNullish(
        modComponentFormState.recipe,
        "Mod component form state has no mod definition",
      );
      const modId = modComponentFormState.recipe.id;
      state.deletedModComponentFormStatesByModId[modId] ??= [];

      state.deletedModComponentFormStatesByModId[modId].push(
        modComponentFormState,
      );
      state.modComponentFormStates.splice(modComponentFormStateIndex, 1);
      delete state.dirty[elementId];
      delete state.brickPipelineUIStateById[elementId];
      state.activeModComponentId = null;

      if (keepLocalCopy) {
        const newId = uuidv4();
        state.modComponentFormStates.push({
          ...modComponentFormState,
          uuid: newId,
          recipe: undefined,
        });
        state.dirty[newId] = true;
        ensureBrickPipelineUIState(state, newId);
        state.activeModComponentId = newId;
      }
    },
    showSaveAsNewRecipeModal(state) {
      state.visibleModalKey = ModalKey.SAVE_AS_NEW_MOD;
    },
    clearDeletedModComponentFormStatesForMod(
      state,
      action: PayloadAction<RegistryId>,
    ) {
      const modId = action.payload;
      delete state.deletedModComponentFormStatesByModId[modId];
    },
    restoreDeletedModComponentFormStatesForMod(
      state,
      action: PayloadAction<RegistryId>,
    ) {
      const modId = action.payload;
      const deletedModComponentFormStates =
        state.deletedModComponentFormStatesByModId[modId];
      if (deletedModComponentFormStates?.length) {
        state.modComponentFormStates.push(...deletedModComponentFormStates);
        for (const formStateId of deletedModComponentFormStates.map(
          (element) => element.uuid,
        )) {
          state.dirty[formStateId] = false;
          ensureBrickPipelineUIState(state, formStateId);
        }

        delete state.deletedModComponentFormStatesByModId[modId];
      }
    },
    removeRecipeData(state, action: PayloadAction<RegistryId>) {
      const recipeId = action.payload;
      removeModData(state, recipeId);
    },
    showCreateRecipeModal(
      state,
      action: PayloadAction<{ keepLocalCopy: boolean }>,
    ) {
      state.visibleModalKey = ModalKey.CREATE_MOD;
      state.keepLocalCopyOnCreateMod = action.payload.keepLocalCopy;
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

      const modComponentFormState = state.modComponentFormStates.find(
        (x) => x.uuid === state.activeModComponentId,
      );

      assertNotNullish(
        modComponentFormState,
        `Active mod component form state not found for id: ${state.activeModComponentId}`,
      );

      const pipeline: unknown[] | null = get(
        modComponentFormState,
        pipelinePath,
      );
      if (pipeline == null) {
        console.error("Invalid pipeline path for element: %s", pipelinePath, {
          block,
          invalidPath: getInvalidPath(
            cloneDeep(modComponentFormState),
            pipelinePath,
          ),
          element: cloneDeep(modComponentFormState),
          pipelinePath,
          pipelineIndex,
        });
        throw new Error(`Invalid pipeline path for element: ${pipelinePath}`);
      }

      pipeline.splice(pipelineIndex, 0, block);
      syncNodeUIStates(state, modComponentFormState);
      assertNotNullish(block.instanceId, "Block instanceId not found");
      setActiveNodeId(state, block.instanceId);
      state.dirty[modComponentFormState.uuid] = true;

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
      syncNodeUIStates(state, activeModComponentFormState);

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
      const activeModComponentId = validateactiveModComponentId(state);
      state.dirty[activeModComponentId] = true;
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

      syncNodeUIStates(state, activeModComponentFormState);

      activeModComponentUiState.activeNodeId =
        nextActiveNode?.instanceId ?? FOUNDATION_NODE_ID;

      state.dirty[activeModComponentFormState.uuid] = true;

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
    },
    showAddBlockModal(state, action: PayloadAction<AddBrickLocation>) {
      state.addBrickLocation = action.payload;
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
      const recipeId = state.activeModId;
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
      const brickPipelineUIState = validateBrickPipelineUIState(state);
      const nodeUIState = brickPipelineUIState.nodeUIStates[nodeId];
      assertNotNullish(
        nodeUIState,
        `Node UI state not found for id: ${nodeId}`,
      );
      nodeUIState.collapsed = false;
    },
    toggleCollapseBrickPipelineNode(state, action: PayloadAction<UUID>) {
      const nodeId = action.payload;
      const brickPipelineUIState = validateBrickPipelineUIState(state);
      const nodeUIState = brickPipelineUIState.nodeUIStates[nodeId];
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
        state.isPendingAvailableActivatedModComponents = true;
        // We're not resetting the result here so that the old value remains during re-calculation
      })
      .addCase(
        checkAvailableInstalledExtensions.fulfilled,
        (state, { payload: { availableInstalledIds } }) => {
          state.isPendingAvailableActivatedModComponents = false;
          state.availableActivatedModComponentIds = availableInstalledIds;
        },
      )
      .addCase(
        checkAvailableInstalledExtensions.rejected,
        (state, { error }) => {
          state.isPendingAvailableActivatedModComponents = false;
          state.error = error;
          reportError(error);
        },
      )
      .addCase(checkAvailableDraftModComponents.pending, (state) => {
        state.isPendingDraftModComponents = true;
        // We're not resetting the result here so that the old value remains during re-calculation
      })
      .addCase(
        checkAvailableDraftModComponents.fulfilled,
        (state, { payload: { availableDraftModComponentIds } }) => {
          state.isPendingDraftModComponents = false;
          state.availableDraftModComponentIds = availableDraftModComponentIds;
        },
      )
      .addCase(
        checkAvailableDraftModComponents.rejected,
        (state, { error }) => {
          state.isPendingDraftModComponents = false;
          state.error = error;
          reportError(error);
        },
      )
      .addCase(
        checkActiveModComponentAvailability.fulfilled,
        (state, { payload: { availableDraftModComponentIds } }) => ({
          ...state,
          availableDraftModComponentIds,
        }),
      );
  },
});
/* eslint-enable security/detect-object-injection  */

export const actions = {
  ...editorSlice.actions,
  cloneActiveExtension,
  checkAvailableInstalledExtensions,
  checkAvailableDraftModComponents,
  checkActiveModComponentAvailability,
};

export const persistEditorConfig = {
  key: "editor",
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 3,
  migrate: createMigrate(migrations, { debug: Boolean(process.env.DEBUG) }),
  blacklist: [
    "inserting",
    "isVarPopoverVisible",
    "isSaveDataIntegrityErrorModalVisible",
  ],
};

function validateactiveModComponentId(state: Draft<EditorState>) {
  const { activeModComponentId } = state;
  assertNotNullish(activeModComponentId, "Active element not found");

  return activeModComponentId;
}

function validateBrickPipelineUIState(state: Draft<EditorState>) {
  const brickPipelineUIState =
    state.brickPipelineUIStateById[validateactiveModComponentId(state)];

  assertNotNullish(
    brickPipelineUIState,
    `Brick Pipeline UI state not found for activeModComponentId: ${state.activeModComponentId}`,
  );

  return brickPipelineUIState;
}

function validateNodeUIState(state: Draft<EditorState>) {
  const brickPipelineUIState = validateBrickPipelineUIState(state);

  const nodeUIState =
    brickPipelineUIState.nodeUIStates[brickPipelineUIState.activeNodeId];

  assertNotNullish(
    nodeUIState,
    `Brick Pipeline UI state not found for activeNodeId: ${brickPipelineUIState.activeNodeId}`,
  );
  return nodeUIState;
}
