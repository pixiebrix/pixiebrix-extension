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
import { FOUNDATION_NODE_ID } from "@/pageEditor/store/editor/uiState";
import { type BrickConfig } from "@/bricks/types";
import {
  type AddBrickLocation,
  type EditorRootState,
  type EditorState,
  type ModalDefinition,
  ModalKey,
  type ModMetadataFormState,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { uuidv4 } from "@/types/helpers";
import { cloneDeep, compact, get, pull, uniq } from "lodash";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { type TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { getInvalidPath } from "@pixiebrix/util-debug";
import {
  selectActiveBrickConfigurationUIState,
  selectActiveBrickPipelineUIState,
  selectActiveModComponentFormState,
  selectActiveModId,
  selectGetModComponentFormStateByModComponentId,
  selectGetModComponentFormStatesForMod,
  selectModComponentFormStates,
  selectNotDeletedActivatedModComponents,
} from "./editorSelectors";
import {
  isQuickBarStarterBrick,
  type ModComponentFormState,
} from "@/pageEditor/starterBricks/formStateTypes";
import reportError from "@/telemetry/reportError";
import {
  markModComponentFormStateAsDeleted,
  setActiveModComponentId,
  setActiveNodeId,
  syncBrickConfigurationUIStates,
} from "@/pageEditor/store/editor/editorSliceHelpers";
import { type Draft, produce } from "immer";
import { normalizePipelineForEditor } from "@/pageEditor/starterBricks/pipelineMapping";
import { type ModComponentsRootState } from "@/store/modComponents/modComponentTypes";
import {
  checkAvailable,
  getRunningStarterBricks,
} from "@/contentScript/messenger/api";
import { hydrateModComponentInnerDefinitions } from "@/registry/hydrateInnerDefinitions";
import { QuickBarStarterBrickABC } from "@/starterBricks/quickBar/quickBarStarterBrick";
import { testMatchPatterns } from "@/bricks/available";
import { serializeError } from "serialize-error";
import { type StorageInterface } from "@/store/StorageInterface";
import { localStorage } from "redux-persist-webextension-storage";
import { removeUnusedDependencies } from "@/components/fields/schemaFields/integrations/integrationDependencyFieldUtils";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import {
  type ModDefinition,
  type ModOptionsDefinition,
  type ModVariablesDefinition,
} from "@/types/modDefinitionTypes";
import {
  type ModComponentBase,
  type ModMetadata,
} from "@/types/modComponentTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { createMigrate, type PersistConfig } from "redux-persist";
import { migrations } from "@/store/editorMigrations";
import { type BaseStarterBrickState } from "@/pageEditor/store/editor/baseFormStateTypes";
import {
  getCurrentInspectedURL,
  inspectedTab,
} from "@/pageEditor/context/connection";
import { assertNotNullish } from "@/utils/nullishUtils";
import {
  initialEphemeralState,
  initialState,
} from "@/store/editorInitialState";
import castEditorState from "@/pageEditor/store/castState";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

/**
 * Duplicate the active mod component within the containing mod.
 *
 * Is an AsyncThunk because it depends on data from the brick registry.
 */
const duplicateActiveModComponent = createAsyncThunk<
  void,
  | {
      /**
       * Optional destination mod to create the duplicate in.
       */
      destinationModMetadata?: ModComponentBase["modMetadata"];
    }
  | undefined,
  { state: EditorRootState }
>("editor/duplicateActiveModComponent", async (options, thunkAPI) => {
  const state = thunkAPI.getState();

  const destinationModMetadata = options?.destinationModMetadata;

  const originalFormState = selectActiveModComponentFormState(state);
  assertNotNullish(
    originalFormState,
    "Active mod component form state not found",
  );

  const newFormState = await produce(originalFormState, async (draft) => {
    draft.uuid = uuidv4();
    draft.label += " (Copy)";
    draft.modMetadata = destinationModMetadata ?? draft.modMetadata;
    // Re-generate instance IDs for all the bricks in the mod component
    draft.modComponent.brickPipeline = await normalizePipelineForEditor(
      draft.modComponent.brickPipeline,
    );
  });

  thunkAPI.dispatch(
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- Add the cloned mod component
    actions.addModComponentFormState(newFormState),
  );
});

type AvailableActivatedModComponents = {
  availableActivatedModComponentIds: UUID[];
};

const checkAvailableActivatedModComponents = createAsyncThunk<
  AvailableActivatedModComponents,
  void,
  { state: EditorRootState & ModComponentsRootState }
>("editor/checkAvailableActivatedModComponents", async (arg, thunkAPI) => {
  const notDeletedFormStates = selectModComponentFormStates(
    thunkAPI.getState(),
  );
  const notDeletedModComponents = selectNotDeletedActivatedModComponents(
    thunkAPI.getState(),
  );
  const starterBricks = await getRunningStarterBricks(inspectedTab);
  const activatedStarterBricks = new Map(
    starterBricks.map((starterBrick) => [starterBrick.id, starterBrick]),
  );
  const resolved = await Promise.all(
    notDeletedModComponents.map(async (modComponent) =>
      hydrateModComponentInnerDefinitions(modComponent),
    ),
  );
  const tabUrl = await getCurrentInspectedURL();
  const availableStarterBrickIds = resolved
    .filter((x) => {
      const activatedStarterBrick = activatedStarterBricks.get(
        x.extensionPointId,
      );
      // Not activated means not available
      if (activatedStarterBrick == null) {
        return false;
      }

      // QuickBar is activated on every page, need to filter by the documentUrlPatterns
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
  // slice and remove activated mod components when they become draft form states
  const notDraftActivated = notDeletedModComponents.filter(
    (modComponent) =>
      !notDeletedFormStates.some(
        (modComponentFormState) =>
          modComponentFormState.uuid === modComponent.id,
      ),
  );

  const availableActivatedModComponentIds = notDraftActivated
    .filter((x) => availableStarterBrickIds.includes(x.id))
    .map((x) => x.id);

  return { availableActivatedModComponentIds };
});

async function isStarterBrickFormStateAvailable(
  tabUrl: string,
  starterBrickFormState: BaseStarterBrickState,
): Promise<boolean> {
  if (isQuickBarStarterBrick(starterBrickFormState)) {
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
>(
  "editor/checkAvailableDraftModComponentFormStates",
  async (_arg, thunkAPI) => {
    const notDeletedFormStates = selectModComponentFormStates(
      thunkAPI.getState(),
    );
    const tabUrl = await getCurrentInspectedURL();
    const availableFormStateIds = await Promise.all(
      notDeletedFormStates.map(
        async ({ uuid, starterBrick: formStateStarterBrick }) => {
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
  },
);

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
    activeModComponentFormState.starterBrick,
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
    ///
    /// GENERAL NAVIGATION
    ///

    resetEditor() {
      return initialState;
    },

    showHomePane(state) {
      state.activeModComponentId = null;
      state.activeModId = null;
      state.expandedModId = null;
      state.error = null;
      state.selectionSeq++;
    },

    hideModal(state) {
      state.visibleModal = null;
    },

    ///
    /// ERROR/WARNING HANDLING
    ///

    adapterError(state, action: PayloadAction<{ uuid: UUID; error: unknown }>) {
      const { uuid, error } = action.payload;
      state.error = serializeError(error);
      state.activeModComponentId = uuid;
      state.selectionSeq++;
    },

    dismissDimensionsWarning(state) {
      state.isDimensionsWarningDismissed = true;
    },

    showSaveDataIntegrityErrorModal(state) {
      state.visibleModal = {
        type: ModalKey.SAVE_DATA_INTEGRITY_ERROR,
        data: {},
      };
    },

    ///
    /// MOD LISTING PANE NAVIGATION
    ///

    /**
     * Select the mod with the given id. Expands the mod listing pane item if not already expanded
     * @see toggleExpandedModId
     */
    setActiveModId(state, action: PayloadAction<RegistryId>) {
      const modId = action.payload;

      state.error = null;
      state.activeModId = modId;

      state.activeModComponentId = null;

      if (state.expandedModId !== modId) {
        state.expandedModId = modId;
      }

      state.selectionSeq++;
    },

    /**
     * Set the expanded mod id.
     */
    setExpandedModId(state, action: PayloadAction<RegistryId | null>) {
      state.expandedModId = action.payload;
    },

    /**
     * Select the mod component with the given ID. NOTE: this action is only navigational. The form state must have
     * already been added to the Page Editor using addModComponentFormState
     * @see addModComponentFormState
     */
    setActiveModComponentId(state, action: PayloadAction<UUID>) {
      const modComponentId = action.payload;
      const getModComponentFormStateByModComponentId =
        selectGetModComponentFormStateByModComponentId({
          editor: castEditorState(state),
        });
      const modComponentFormState =
        getModComponentFormStateByModComponentId(modComponentId);

      assertNotNullish(
        modComponentFormState,
        `Unknown draft mod component: ${action.payload}`,
      );

      setActiveModComponentId(state, modComponentFormState);
    },

    setModListExpanded(
      state,
      { payload }: PayloadAction<{ isExpanded: boolean }>,
    ) {
      state.isModListingPanelExpanded = payload.isExpanded;
    },

    ///
    /// MOD LISTING PANE OPERATIONS
    ///

    showCreateModModal(
      state,
      action: PayloadAction<
        Extract<ModalDefinition, { type: ModalKey.CREATE_MOD }>["data"]
      >,
    ) {
      state.visibleModal = {
        type: ModalKey.CREATE_MOD,
        data: action.payload,
      };
    },

    showSaveAsNewModModal(state) {
      state.visibleModal = {
        type: ModalKey.SAVE_AS_NEW_MOD,
        data: {},
      };
    },

    showSaveModVersionModal(
      state,
      {
        payload,
      }: PayloadAction<{
        packageId: UUID;
        sourceModDefinition: ModDefinition;
      }>,
    ) {
      const { packageId, sourceModDefinition } = payload;

      state.visibleModal = {
        type: ModalKey.SAVE_MOD_VERSION,
        data: {
          packageId,
          // Cast required due to draft/immutable shenanigans with RJSF uiSchema
          sourceModDefinition: sourceModDefinition as Draft<ModDefinition>,
        },
      };
    },

    showMoveCopyToModModal(
      state,
      action: PayloadAction<{ moveOrCopy: "move" | "copy" }>,
    ) {
      state.visibleModal = {
        type: ModalKey.MOVE_COPY_TO_MOD,
        data: {
          keepLocalCopy: action.payload.moveOrCopy === "copy",
        },
      };
    },

    ///
    /// MOD OPERATIONS
    ///

    editModMetadata(state, action: PayloadAction<ModMetadataFormState>) {
      const { activeModId } = state;
      assertNotNullish(activeModId, "Expected active mod");
      state.dirtyModMetadataById[activeModId] = action.payload;
    },

    editModOptionsDefinition(
      state,
      action: PayloadAction<ModOptionsDefinition>,
    ) {
      const { activeModId } = state;
      assertNotNullish(activeModId, "Expected active mod");
      state.dirtyModOptionsDefinitionById[activeModId] =
        action.payload as Draft<ModOptionsDefinition>;
    },

    editModOptionsArgs(state, action: PayloadAction<OptionsArgs>) {
      const { activeModId } = state;
      assertNotNullish(activeModId, "Expected active mod");

      state.dirtyModOptionsArgsById[activeModId] =
        action.payload as Draft<OptionsArgs>;

      // Bump sequence number because arguments impact mod functionality
      state.selectionSeq++;
    },

    editModVariablesDefinition(
      state,
      action: PayloadAction<ModVariablesDefinition>,
    ) {
      const { activeModId } = state;
      assertNotNullish(activeModId, "Expected active mod");
      state.dirtyModVariablesDefinitionById[activeModId] =
        action.payload as Draft<ModVariablesDefinition>;
    },

    updateModMetadataOnModComponentFormStates(
      state,
      action: PayloadAction<{ modId: RegistryId; modMetadata: ModMetadata }>,
    ) {
      const { modId, modMetadata } = action.payload;
      const getModComponentFormStatesForMod =
        selectGetModComponentFormStatesForMod({
          editor: castEditorState(state),
        });
      const modComponentFormStatesForMod =
        getModComponentFormStatesForMod(modId);

      // Technically this method should also update the deleted form states. But this reducer method is only called
      // when the mod is being saved, so those deleted form states will be removed anyway.
      for (const formState of modComponentFormStatesForMod) {
        formState.modMetadata = modMetadata;
      }

      // Bump sequence number because the modId might have changed. The other metadata doesn't affect functionality
      state.selectionSeq++;
    },

    /**
     * Mark a mod and all of its associated form states as clean.
     * @see markModComponentFormStateAsClean
     */
    markModAsCleanById(state, action: PayloadAction<RegistryId>) {
      const modId = action.payload;
      const getModComponentFormStatesForMod =
        selectGetModComponentFormStatesForMod({
          editor: castEditorState(state),
        });
      const modComponentFormStatesForMod =
        getModComponentFormStatesForMod(modId);

      for (const modComponentFormState of modComponentFormStatesForMod) {
        modComponentFormState.installed = true;
        state.dirty[modComponentFormState.uuid] = false;
      }

      delete state.deletedModComponentFormStateIdsByModId[modId];
      delete state.dirtyModMetadataById[modId];
      delete state.dirtyModOptionsDefinitionById[modId];
      delete state.dirtyModVariablesDefinitionById[modId];
      delete state.dirtyModOptionsArgsById[modId];
    },

    /**
     * Remove all editor state associated with a given mod id.
     */
    removeModById(state, action: PayloadAction<RegistryId>) {
      const modId = action.payload;

      const getModComponentFormStatesForMod =
        selectGetModComponentFormStatesForMod({
          editor: castEditorState(state),
        });
      const modComponentFormStatesForMod =
        getModComponentFormStatesForMod(modId);

      const modComponentIds = modComponentFormStatesForMod.map((x) => x.uuid);

      for (const modComponentId of modComponentIds) {
        markModComponentFormStateAsDeleted(state, modComponentId);
      }

      if (state.activeModId === modId) {
        state.activeModId = null;
      }

      if (state.expandedModId === modId) {
        state.expandedModId = null;
      }

      // Perform cleanup last because removeModComponentFormState sets entries on deletedModComponentFormStatesByModId
      delete state.dirtyModOptionsDefinitionById[modId];
      delete state.dirtyModVariablesDefinitionById[modId];
      delete state.dirtyModOptionsArgsById[modId];
      delete state.dirtyModMetadataById[modId];
      delete state.deletedModComponentFormStateIdsByModId[modId];
      delete state.findInModQueryByModId[modId];
    },

    ///
    /// MOD COMPONENT OPERATIONS
    ///

    /**
     * Add a new form state corresponding to a draft mod component that does not have an associated activated
     * mod instance. Sets as selected.
     *
     * Sets the form state as dirty by default.
     */
    addModComponentFormState(
      state,
      // Expose simpler payload type for most common use cases
      action: PayloadAction<
        | ModComponentFormState
        | {
            modComponentFormState: ModComponentFormState;
            dirty: boolean;
            activate: boolean;
          }
      >,
    ) {
      // Ensure the form state is writeable for normalization
      const { modComponentFormState, dirty, activate } = cloneDeep(
        "modComponentFormState" in action.payload
          ? action.payload
          : // Default dirty to true
            {
              modComponentFormState: action.payload,
              dirty: true,
              activate: true,
            },
      );

      const modComponentId = modComponentFormState.uuid;

      if (state.modComponentFormStates.some((x) => x.uuid === modComponentId)) {
        throw new Error("Form state already exists for mod component");
      }

      state.modComponentFormStates.push(modComponentFormState);
      state.dirty[modComponentId] = dirty;

      if (activate) {
        setActiveModComponentId(state, modComponentFormState);
      }
    },

    /**
     * Set/replace an existing draft form state. For use in:
     * - Synchronizing the Formik state with the Redux state
     * - Clearing/reverting changes to a form state
     * - Jest tests that don't render a configuration editor UI
     *
     * @throws Error if a form state with a matching id does not exist
     */
    setModComponentFormState(
      state,
      action: PayloadAction<{
        modComponentFormState: ModComponentFormState;
        /**
         * Set the dirty state of the form state. If undefined, the dirty state will not be modified.
         */
        dirty?: boolean;
        /**
         * Force the Page Editor to remount the Formik form because there are changes in the ModComponentFormState that
         * are not reflected in the Formik form.
         */
        includesNonFormikChanges: boolean;
      }>,
    ) {
      const { modComponentFormState, dirty, includesNonFormikChanges } =
        action.payload;
      const { uuid: modComponentId } = modComponentFormState;

      const index = state.modComponentFormStates.findIndex(
        (x) => x.uuid === modComponentId,
      );
      if (index < 0) {
        throw new Error(`Unknown draft mod component: ${modComponentId}`);
      }

      state.modComponentFormStates[index] = modComponentFormState;

      if (dirty != null) {
        state.dirty[modComponentId] = dirty;
      }

      if (includesNonFormikChanges) {
        state.selectionSeq++;
      }

      syncBrickConfigurationUIStates(state, modComponentFormState);
    },

    /**
     * Marks the form state as clean and corresponding to an activated mod component, i.e., it has no unsaved changes.
     * @see markModAsCleanById
     */
    markModComponentFormStateAsClean(state, action: PayloadAction<UUID>) {
      const modComponentId = action.payload;

      const getModComponentFormStateByModComponentId =
        selectGetModComponentFormStateByModComponentId({
          editor: castEditorState(state),
        });
      const modComponentFormState =
        getModComponentFormStateByModComponentId(modComponentId);

      assertNotNullish(
        modComponentFormState,
        `Unknown draft mod component: ${modComponentId}`,
      );

      modComponentFormState.installed = true;
      state.dirty[modComponentId] = false;
    },

    /**
     * Mark the form state as deleted from the mod.
     */
    markModComponentFormStateAsDeleted(state, action: PayloadAction<UUID>) {
      markModComponentFormStateAsDeleted(state, action.payload);
    },

    ///
    /// OUTLINE PANE NAVIGATION
    ///

    setActiveNodeId(state, action: PayloadAction<UUID>) {
      setActiveNodeId(state, action.payload);
    },

    expandBrickPipelineNode(state, action: PayloadAction<UUID>) {
      const nodeId = action.payload;
      const brickPipelineUIState = validateBrickPipelineUIState(state);
      const brickConfigurationUIState =
        brickPipelineUIState.nodeUIStates[nodeId];
      assertNotNullish(
        brickConfigurationUIState,
        `Node UI state not found for id: ${nodeId}`,
      );
      brickConfigurationUIState.collapsed = false;
    },

    toggleCollapseBrickPipelineNode(state, action: PayloadAction<UUID>) {
      const nodeId = action.payload;
      const brickPipelineUIState = validateBrickPipelineUIState(state);
      const brickConfigurationUIState =
        brickPipelineUIState.nodeUIStates[nodeId];
      assertNotNullish(
        brickConfigurationUIState,
        `Node UI state not found for id: ${nodeId}`,
      );
      brickConfigurationUIState.collapsed =
        !brickConfigurationUIState.collapsed;
    },

    ///
    /// OUTLINE PANE OPERATIONS
    ///

    showAddBrickModal(state, action: PayloadAction<AddBrickLocation>) {
      state.visibleModal = {
        type: ModalKey.ADD_BRICK,
        data: { addBrickLocation: action.payload },
      };
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

      assertNotNullish(
        state.activeModComponentId,
        "Active mod component id not found",
      );

      const getModComponentFormStateByModComponentId =
        selectGetModComponentFormStateByModComponentId({
          editor: castEditorState(state),
        });
      const modComponentFormState = getModComponentFormStateByModComponentId(
        state.activeModComponentId,
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
        console.error(
          "Invalid pipeline path for mod component form state: %s",
          pipelinePath,
          {
            block,
            invalidPath: getInvalidPath(
              cloneDeep(modComponentFormState as Draft<ModComponentFormState>),
              pipelinePath,
            ),
            element: cloneDeep(modComponentFormState),
            pipelinePath,
            pipelineIndex,
          },
        );
        throw new Error(
          `Invalid pipeline path for mod component form state: ${pipelinePath}`,
        );
      }

      pipeline.splice(pipelineIndex, 0, block);
      syncBrickConfigurationUIStates(state, modComponentFormState);
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
        editor: castEditorState(state),
      });
      assertNotNullish(
        activeModComponentFormState,
        "Active mod component form state not found",
      );

      const activeBrickPipelineUIState = selectActiveBrickPipelineUIState({
        editor: castEditorState(state),
      });
      const node = activeBrickPipelineUIState?.pipelineMap[nodeId];
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
      syncBrickConfigurationUIStates(state, activeModComponentFormState);

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
      const activeModComponentId = validateActiveModComponentId(state);
      state.dirty[activeModComponentId] = true;
    },

    removeNode(state, action: PayloadAction<UUID>) {
      const nodeIdToRemove = action.payload;
      const activeModComponentFormState = selectActiveModComponentFormState({
        editor: castEditorState(state),
      });
      assertNotNullish(
        activeModComponentFormState,
        "Active mod component form state not found",
      );

      const activeBrickPipelineUIState = selectActiveBrickPipelineUIState({
        editor: castEditorState(state),
      });
      assertNotNullish(
        activeBrickPipelineUIState,
        "Active mod component UI state not found",
      );
      const node = activeBrickPipelineUIState.pipelineMap[nodeIdToRemove];
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

      syncBrickConfigurationUIStates(state, activeModComponentFormState);

      activeBrickPipelineUIState.activeNodeId =
        nextActiveNode?.instanceId ?? FOUNDATION_NODE_ID;

      state.dirty[activeModComponentFormState.uuid] = true;

      // This change should re-initialize the Page Editor Formik form
      state.selectionSeq++;
    },

    ///
    /// OUTLINE PANE OPERATIONS: COPY/PASTE
    ///

    copyBrickConfig(state, action: PayloadAction<BrickConfig>) {
      const copy = { ...action.payload };
      delete copy.instanceId;
      state.copiedBrick = copy;
    },

    clearCopiedBrickConfig(state) {
      state.copiedBrick = null;
    },

    ///
    /// BRICK CONFIGURATION PANE NAVIGATION
    ///

    setExpandedFieldSections(
      state,
      { payload }: PayloadAction<{ id: string; isExpanded: boolean }>,
    ) {
      const uiState = selectActiveBrickConfigurationUIState({
        editor: castEditorState(state),
      });
      assertNotNullish(uiState, "Active node UI state not found");

      if (uiState.expandedFieldSections === undefined) {
        uiState.expandedFieldSections = {};
      }

      const { id, isExpanded } = payload;
      uiState.expandedFieldSections[id] = isExpanded;
    },

    ///
    /// VARIABLE POPOVER NAVIGATION
    ///

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

    ///
    /// DATA PANEL NAVIGATION
    ///

    setDataPanelExpanded(
      state,
      { payload }: PayloadAction<{ isExpanded: boolean }>,
    ) {
      state.isDataPanelExpanded = payload.isExpanded;
    },

    setNodeDataPanelTabSelected(state, action: PayloadAction<DataPanelTabKey>) {
      const brickConfigurationUIState =
        validateBrickConfigurationUIState(state);
      brickConfigurationUIState.dataPanel.activeTabKey = action.payload;
    },

    /**
     * Updates the viewMode on a DataPane tab
     */
    setNodeDataPanelTabViewMode(
      state,
      action: PayloadAction<{ tabKey: DataPanelTabKey; viewMode: string }>,
    ) {
      const { tabKey, viewMode } = action.payload;

      const brickConfigurationUIState =
        validateBrickConfigurationUIState(state);

      brickConfigurationUIState.dataPanel[tabKey].viewMode = viewMode;
    },

    /**
     * Updates the query on a DataPane tab with the JsonTree component
     */
    setNodeDataPanelTabSearchQuery(
      state,
      action: PayloadAction<{ tabKey: DataPanelTabKey; query: string }>,
    ) {
      const { tabKey, query } = action.payload;

      const brickConfigurationUIState =
        validateBrickConfigurationUIState(state);

      brickConfigurationUIState.dataPanel[tabKey].query = query;
    },

    /**
     * Updates the query on the Find tab
     */
    setDataPanelTabFindQuery(state, action: PayloadAction<{ query: string }>) {
      const { query } = action.payload;

      const activeModId = selectActiveModId({
        editor: castEditorState(state),
      });
      assertNotNullish(activeModId, "Expected activeModId");

      state.findInModQueryByModId[activeModId] = { query };
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
      const brickConfigurationUIState =
        validateBrickConfigurationUIState(state);
      brickConfigurationUIState.dataPanel[tabKey].treeExpandedState =
        expandedState;
    },

    ///
    /// DESIGN PANE NAVIGATION
    ///

    setActiveBuilderPreviewElement(
      state,
      action: PayloadAction<string | null>,
    ) {
      const activeElement = action.payload;
      const brickConfigurationUIState =
        validateBrickConfigurationUIState(state);

      brickConfigurationUIState.dataPanel[
        DataPanelTabKey.Design
      ].activeElement = activeElement;

      brickConfigurationUIState.dataPanel[
        DataPanelTabKey.Outline
      ].activeElement = activeElement;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(checkAvailableActivatedModComponents.pending, (state) => {
        state.isPendingAvailableActivatedModComponents = true;
        // We're not resetting the result here so that the old value remains during re-calculation
      })
      .addCase(
        checkAvailableActivatedModComponents.fulfilled,
        (state, { payload: { availableActivatedModComponentIds } }) => {
          state.isPendingAvailableActivatedModComponents = false;
          state.availableActivatedModComponentIds =
            availableActivatedModComponentIds;
        },
      )
      .addCase(
        checkAvailableActivatedModComponents.rejected,
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
  duplicateActiveModComponent,
  checkAvailableActivatedModComponents,
  checkAvailableDraftModComponents,
  checkActiveModComponentAvailability,
};

export const persistEditorConfig: PersistConfig<EditorState> = {
  key: "editor",
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 14,
  migrate: createMigrate(migrations, { debug: Boolean(process.env.DEBUG) }),
  blacklist: Object.keys(initialEphemeralState),
};

function validateActiveModComponentId(state: Draft<EditorState>) {
  const { activeModComponentId } = state;
  assertNotNullish(activeModComponentId, "Active mod component not found");

  return activeModComponentId;
}

function validateBrickPipelineUIState(state: Draft<EditorState>) {
  const brickPipelineUIState =
    state.brickPipelineUIStateById[validateActiveModComponentId(state)];

  assertNotNullish(
    brickPipelineUIState,
    `Brick Pipeline UI state not found for activeModComponentId: ${state.activeModComponentId}`,
  );

  return brickPipelineUIState;
}

function validateBrickConfigurationUIState(state: Draft<EditorState>) {
  const brickPipelineUIState = validateBrickPipelineUIState(state);

  const brickConfigurationUIState =
    brickPipelineUIState.nodeUIStates[brickPipelineUIState.activeNodeId];

  assertNotNullish(
    brickConfigurationUIState,
    `Brick Pipeline UI state not found for activeNodeId: ${brickPipelineUIState.activeNodeId}`,
  );
  return brickConfigurationUIState;
}
