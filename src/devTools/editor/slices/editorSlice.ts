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
import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";
import { ActionFormState } from "@/devTools/editor/extensionPoints/menuItem";
import { ActionPanelFormState } from "@/devTools/editor/extensionPoints/actionPanel";
import { TriggerFormState } from "@/devTools/editor/extensionPoints/trigger";
import { PanelFormState } from "@/devTools/editor/extensionPoints/panel";
import { ContextMenuFormState } from "@/devTools/editor/extensionPoints/contextMenu";
import { getErrorMessage } from "@/errors";
import { clearExtensionTraces } from "@/telemetry/trace";
import { RegistryId, UUID } from "@/core";
import {
  ElementUIState,
  makeInitialElementUIState,
  makeInitialNodeUIState,
} from "@/devTools/editor/uiState/uiState";
import {
  FOUNDATION_NODE_ID,
  NodeId,
} from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import { WritableDraft } from "immer/dist/types/types-external";
import { BlockConfig } from "@/blocks/types";

export type FormState =
  | ActionFormState
  | ActionPanelFormState
  | TriggerFormState
  | PanelFormState
  | ContextMenuFormState;

export interface EditorState {
  /**
   * A sequence number that changes whenever a new element is selected.
   *
   * Can use as a React component key to trigger a re-render
   */
  selectionSeq: number;

  /**
   * The element type, if the page editor is in "insertion-mode"
   */
  inserting: ElementType | null;

  /**
   * The uuid of the active element, or null if no elements are active
   */
  activeElement: UUID | null;

  error: string | null;

  dirty: Record<string, boolean>;

  /**
   * Unsaved elements
   */
  readonly elements: FormState[];

  /**
   * Brick ids (not UUIDs) that are known to be editable by the current user
   */
  knownEditable: RegistryId[];

  /**
   * True if error is because user does not have access to beta features
   */
  beta?: boolean;

  /**
   * Is the user using the new page editor beta UI?
   */
  isBetaUI: boolean;

  /**
   * The current UI state of each element, indexed by element Id
   */
  elementUIStates: Record<UUID, ElementUIState>;

  /**
   * A clipboard-style-copy of a block ready to paste into an extension
   */
  copiedBlock?: BlockConfig;

  /**
   * Are we currently showing the info message to users about upgrading from v2 to v3 of
   * the runtime api for this extension?
   */
  showV3UpgradeMessageByElement: Record<UUID, boolean>;
}

export const initialState: EditorState = {
  selectionSeq: 0,
  activeElement: null,
  error: null,
  beta: false,
  elements: [],
  knownEditable: [],
  dirty: {},
  inserting: null,
  isBetaUI: false,
  elementUIStates: {},
  showV3UpgradeMessageByElement: {},
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
    toggleInsert: (state, action: PayloadAction<ElementType>) => {
      state.inserting = action.payload;
      state.beta = false;
      state.error = null;
    },
    markEditable: (state, action: PayloadAction<RegistryId>) => {
      state.knownEditable.push(action.payload);
    },
    addElement: (state, action: PayloadAction<FormState>) => {
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
    betaError: (state, action: PayloadAction<{ error: string }>) => {
      state.error = action.payload.error;
      state.beta = true;
      state.activeElement = null;
    },
    adapterError: (
      state,
      action: PayloadAction<{ uuid: UUID; error: unknown }>
    ) => {
      const { uuid, error } = action.payload;
      state.error = getErrorMessage(error);
      state.beta = false;
      state.activeElement = uuid;
      state.selectionSeq++;
    },
    selectInstalled: (state, action: PayloadAction<FormState>) => {
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
      state.selectionSeq++;
      ensureElementUIState(state, uuid);
    },
    resetInstalled: (state, actions: PayloadAction<FormState>) => {
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
    selectElement: (state, action: PayloadAction<UUID>) => {
      const elementId = action.payload;
      if (!state.elements.some((x) => x.uuid === elementId)) {
        throw new Error(`Unknown dynamic element: ${action.payload}`);
      }

      state.error = null;
      state.beta = null;
      state.activeElement = elementId;
      state.selectionSeq++;
      ensureElementUIState(state, elementId);
    },
    markSaved: (state, action: PayloadAction<UUID>) => {
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
    editElement: (state, action: PayloadAction<FormState>) => {
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
    updateElement: (
      state,
      action: PayloadAction<{ uuid: UUID } & Partial<FormState>>
    ) => {
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
    removeElement: (state, action: PayloadAction<UUID>) => {
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
    setBetaUIEnabled: (state, action: PayloadAction<boolean>) => {
      state.isBetaUI = action.payload;
    },
    removeElementNodeUIState: (
      state,
      action: PayloadAction<{
        nodeIdToRemove: NodeId;
        newActiveNodeId?: NodeId;
      }>
    ) => {
      const elementUIState = state.elementUIStates[state.activeElement];
      const { nodeIdToRemove, newActiveNodeId } = action.payload;

      const activeNodeId = newActiveNodeId ?? FOUNDATION_NODE_ID;
      setActiveNodeId(state, activeNodeId);

      delete elementUIState.nodeUIStates[nodeIdToRemove];
    },
    setElementActiveNodeId: (state, action: PayloadAction<NodeId>) => {
      setActiveNodeId(state, action.payload);
    },
    setNodeDataPanelTabSelected: (state, action: PayloadAction<string>) => {
      const elementUIState = state.elementUIStates[state.activeElement];
      const nodeUIState =
        elementUIState.nodeUIStates[elementUIState.activeNodeId];
      nodeUIState.dataPanel.activeTabKey = action.payload;
    },
    setNodeDataPanelTabSearchQuery: (
      state,
      action: PayloadAction<{ tabKey: string; query: string }>
    ) => {
      const { tabKey, query } = action.payload;
      const elementUIState = state.elementUIStates[state.activeElement];
      const nodeUIState =
        elementUIState.nodeUIStates[elementUIState.activeNodeId];
      nodeUIState.dataPanel.tabQueries[tabKey] = query;
    },
    copyBlockConfig: (state, action: PayloadAction<BlockConfig>) => {
      const copy = { ...action.payload };
      delete copy.instanceId;
      state.copiedBlock = copy;
    },
    clearCopiedBlockConfig: (state) => {
      delete state.copiedBlock;
    },
    showV3UpgradeMessage: (state) => {
      state.showV3UpgradeMessageByElement[state.activeElement] = true;
    },
    hideV3UpgradeMessage: (state) => {
      state.showV3UpgradeMessageByElement[state.activeElement] = false;
    },
  },
});
/* eslint-enable security/detect-object-injection, @typescript-eslint/no-dynamic-delete -- re-enable rule */

export const { actions } = editorSlice;
