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

export interface DocumentBuilderState {
  /**
   * The currently active field in the Form Builder
   */
  activeElement: string | null;
}

export const initialState: DocumentBuilderState = {
  activeElement: null,
};

export const documentBuilderSlice = createSlice({
  name: "documentBuilder",
  initialState,
  reducers: {
    setActiveElement: (state, action: PayloadAction<string>) => {
      state.activeElement = action.payload;
    },
  },
});

export const { actions } = documentBuilderSlice;
