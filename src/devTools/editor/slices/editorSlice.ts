/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { clearExtensionTraces } from "@/background/trace";
import { RegistryId, UUID } from "@/core";
import {
  ElementUIState,
  makeInitialElementUIState,
} from "@/devTools/editor/uiState/uiState";
import {
  FOUNDATION_NODE_ID,
  NodeId,
} from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";

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
};

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
    selectInstalled: (state, actions: PayloadAction<FormState>) => {
      const { uuid } = actions.payload;
      const index = state.elements.findIndex((x) => x.uuid === uuid);
      if (index >= 0) {
        // Safe because we're getting it from findIndex
        // eslint-disable-next-line security/detect-object-injection
        state.elements[index] = actions.payload;
      } else {
        state.elements.push(actions.payload);
      }

      state.error = null;
      state.beta = null;
      state.activeElement = uuid;
      state.selectionSeq++;
      // eslint-disable-next-line security/detect-object-injection -- uuid
      if (state.elementUIStates[uuid] === undefined) {
        // eslint-disable-next-line security/detect-object-injection -- uuid
        state.elementUIStates[uuid] = makeInitialElementUIState();
      }
    },
    resetInstalled: (state, actions: PayloadAction<FormState>) => {
      const { uuid } = actions.payload;
      const index = state.elements.findIndex((x) => x.uuid === uuid);
      if (index >= 0) {
        // Safe because we're getting it from findIndex
        // eslint-disable-next-line security/detect-object-injection
        state.elements[index] = actions.payload;
      } else {
        state.elements.push(actions.payload);
      }

      // eslint-disable-next-line security/detect-object-injection -- is uuid, and also using immer
      state.dirty[uuid] = false;
      state.error = null;
      state.beta = null;
      state.activeElement = uuid;
      state.selectionSeq++;

      // Make sure we're not keeping any private data around from Page Editor sessions
      void clearExtensionTraces(uuid);
    },
    selectElement: (state, action: PayloadAction<UUID>) => {
      if (!state.elements.some((x) => action.payload === x.uuid)) {
        throw new Error(`Unknown dynamic element: ${action.payload}`);
      }

      state.error = null;
      state.beta = null;
      state.activeElement = action.payload;
      state.selectionSeq++;
      if (state.elementUIStates[action.payload] === undefined) {
        state.elementUIStates[action.payload] = makeInitialElementUIState();
      }
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
    // Sync the redux state with the form state
    updateElement: (state, action: PayloadAction<FormState>) => {
      const { uuid } = action.payload;
      const index = state.elements.findIndex((x) => x.uuid === uuid);
      if (index < 0) {
        throw new Error(`Unknown dynamic element: ${uuid}`);
      }

      // Safe b/c generated from findIndex
      // eslint-disable-next-line security/detect-object-injection
      state.elements[index] = action.payload;
      // eslint-disable-next-line security/detect-object-injection -- is uuid, and also using immer
      state.dirty[uuid] = true;
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

      // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-dynamic-delete -- is uuid, and also using immer
      delete state.dirty[uuid];
      // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-dynamic-delete -- is uuid, and also using immer
      delete state.elementUIStates[uuid];

      // Make sure we're not keeping any private data around from Page Editor sessions
      void clearExtensionTraces(uuid);
    },
    setBetaUIEnabled: (state, action: PayloadAction<boolean>) => {
      state.isBetaUI = action.payload;
    },
    addElementNodeUIState: (state, action: PayloadAction<UUID>) => {
      const elementUIState = state.elementUIStates[state.activeElement];
      const nodeId = action.payload;
      // eslint-disable-next-line security/detect-object-injection -- uuid
      elementUIState.nodeUIStates[nodeId] = {
        nodeId,
        dataPanel: {
          activeTabKey: null,
          tabQueries: {},
        },
      };
      elementUIState.activeNodeId = nodeId;
    },
    // Remember to update the active node separately before calling this
    removeElementNodeUIState: (state, action: PayloadAction<UUID>) => {
      const elementUIState = state.elementUIStates[state.activeElement];
      const nodeIdToRemove = action.payload;
      // Guard against errors
      if (elementUIState.activeNodeId === nodeIdToRemove) {
        elementUIState.activeNodeId = FOUNDATION_NODE_ID;
      }

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection -- uuid
      delete elementUIState.nodeUIStates[nodeIdToRemove];
    },
    setElementActiveNodeId: (state, action: PayloadAction<NodeId>) => {
      const elementUIState = state.elementUIStates[state.activeElement];
      const nodeId = action.payload;
      // eslint-disable-next-line security/detect-object-injection -- uuid
      if (elementUIState.nodeUIStates[nodeId] === undefined) {
        // eslint-disable-next-line security/detect-object-injection -- uuid
        elementUIState.nodeUIStates[nodeId] = {
          nodeId,
          dataPanel: {
            activeTabKey: null,
            tabQueries: {},
          },
        };
      }

      state.elementUIStates[state.activeElement].activeNodeId = action.payload;
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
      // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
      nodeUIState.dataPanel.tabQueries[tabKey] = query;
    },
  },
});

export const { actions } = editorSlice;
