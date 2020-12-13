/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Schema } from "@/core";
import { ElementInfo } from "@/nativeEditor/frameworks";

export interface ButtonState {
  readonly uuid: string;
  containerSelector: string;
  containerInfo: ElementInfo;
  template: string;
  caption: string;
  position: "append" | "prepend";
  reader: {
    id: string;
    outputSchema: Schema;
    /**
     * Reader type corresponding to built-in reader factory, e.g., jquery, react.
     */
    type: string | null;
    selector: string | null;
  };
  isAvailable: {
    matchPatterns: string;
    selectors: string;
  };
  extensionPoint: {
    id: string;
    name: string;
  };
}

export interface EditorState {
  inserting: boolean;
  activeElement: string | null;
  readonly elements: ButtonState[];
}

export const initialState: EditorState = {
  activeElement: null,
  elements: [],
  inserting: false,
};

export const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    toggleInsert: (state, action: PayloadAction<boolean>) => {
      state.inserting = action.payload;
    },
    addElement: (state, action: PayloadAction<ButtonState>) => {
      const element = action.payload;
      state.activeElement = element.uuid;
      state.elements.push(element);
    },
    selectElement: (state, action: PayloadAction<string>) => {
      state.activeElement = action.payload;
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
    },
  },
});

export const actions = editorSlice.actions;
