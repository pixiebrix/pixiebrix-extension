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
import {
  ElementType,
  isCustomReader,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { ActionFormState } from "@/devTools/editor/extensionPoints/menuItem";
import { ActionPanelFormState } from "@/devTools/editor/extensionPoints/actionPanel";
import { TriggerFormState } from "@/devTools/editor/extensionPoints/trigger";
import { PanelFormState } from "@/devTools/editor/extensionPoints/panel";
import { ContextMenuFormState } from "@/devTools/editor/extensionPoints/contextMenu";

export type FormState =
  | ActionFormState
  | ActionPanelFormState
  | TriggerFormState
  | PanelFormState
  | ContextMenuFormState;

export interface EditorState {
  selectionSeq: number;

  /**
   * The element type, if the page editor is in "insertion-mode"
   */
  inserting: ElementType | null;

  /**
   * The uuid of the active element, or null if no elements are active
   */
  activeElement: string | null;

  error: string | null;

  dirty: Record<string, boolean>;

  /**
   * Unsaved elements
   */
  readonly elements: FormState[];

  /**
   * Brick ids (not UUIDs) that are known to be editable by the current user
   */
  knownEditable: string[];

  /**
   * True if error is because user does not have access to beta features
   */
  beta?: boolean;
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
    markEditable: (state, action: PayloadAction<string>) => {
      state.knownEditable.push(action.payload);
    },
    addElement: (state, action: PayloadAction<FormState>) => {
      const element = action.payload;
      state.elements.push(element);
      state.error = null;
      state.beta = false;
      state.activeElement = element.uuid;
      state.selectionSeq++;
    },
    betaError: (state, action: PayloadAction<{ error: string }>) => {
      state.error = action.payload.error;
      state.beta = true;
      state.activeElement = null;
    },
    adapterError: (
      state,
      action: PayloadAction<{ uuid: string; error: unknown }>
    ) => {
      const { uuid, error } = action.payload;
      if (error instanceof Error) {
        state.error = error.message ?? "Unknown error";
      } else {
        state.error = error.toString() ?? "Unknown error";
      }
      state.beta = false;
      state.activeElement = uuid;
      state.selectionSeq++;
    },
    selectInstalled: (state, actions: PayloadAction<FormState>) => {
      const index = state.elements.findIndex(
        (x) => x.uuid === actions.payload.uuid
      );
      if (index >= 0) {
        // safe because we're getting it from findIndex
        // eslint-disable-next-line security/detect-object-injection
        state.elements[index] = actions.payload;
      } else {
        state.elements.push(actions.payload);
      }
      state.error = null;
      state.beta = null;
      state.activeElement = actions.payload.uuid;
      state.selectionSeq++;
    },
    resetInstalled: (state, actions: PayloadAction<FormState>) => {
      const { uuid } = actions.payload;
      const index = state.elements.findIndex((x) => x.uuid === uuid);
      if (index >= 0) {
        // safe because we're getting it from findIndex
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
    },
    selectElement: (state, action: PayloadAction<string>) => {
      if (!state.elements.some((x) => action.payload === x.uuid)) {
        throw new Error(`Unknown dynamic element: ${action.payload}`);
      }
      state.error = null;
      state.beta = null;
      state.activeElement = action.payload;
      state.selectionSeq++;
    },
    markSaved: (state, action: PayloadAction<string>) => {
      const element = state.elements.find((x) => action.payload === x.uuid);
      if (!element) {
        throw new Error(`Unknown dynamic element: ${action.payload}`);
      }
      if (!element.installed) {
        state.knownEditable.push(
          element.extensionPoint.metadata.id,
          ...element.readers
            .filter((x) => isCustomReader(x))
            .map((x) => x.metadata.id)
        );
      }

      for (const reader of element.readers) {
        if (isCustomReader(reader)) {
          reader._new = false;
        }
      }

      element.installed = true;
      state.dirty[element.uuid] = false;
      // force a reload so the _new flags are correct on the readers
      state.selectionSeq++;
    },
    // sync the redux state with the form state
    updateElement: (state, action: PayloadAction<FormState>) => {
      const { uuid } = action.payload;
      const index = state.elements.findIndex((x) => x.uuid === uuid);
      if (index < 0) {
        throw new Error(`Unknown dynamic element: ${uuid}`);
      }
      // safe b/c generated from findIndex
      // eslint-disable-next-line security/detect-object-injection
      state.elements[index] = action.payload;
      // eslint-disable-next-line security/detect-object-injection -- is uuid, and also using immer
      state.dirty[uuid] = true;
    },
    removeElement: (state, action: PayloadAction<string>) => {
      const uuid = action.payload;
      if (state.activeElement === uuid) {
        state.activeElement = null;
      }
      state.elements.splice(
        state.elements.findIndex((x) => x.uuid === uuid),
        1
      );
      // eslint-disable-next-line security/detect-object-injection -- is uuid, and also using immer
      delete state.dirty[uuid];
    },
  },
});

export const actions = editorSlice.actions;
