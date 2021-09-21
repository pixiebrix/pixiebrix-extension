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

export interface ElementWizardState {
  /**
   * The currently active step in the Element Wizard
   */
  step: string;
  /**
   * The currently active field in the Form Builder
   */
  formBuilderActiveField: string;
}

export const initialState: ElementWizardState = {
  step: null,
  formBuilderActiveField: null,
};

export const elementWizardSlice = createSlice({
  name: "elementWizard",
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<string>) => {
      state.step = action.payload;
      state.formBuilderActiveField = null;
    },
    setFormBuilderActiveField: (state, action: PayloadAction<string>) => {
      state.formBuilderActiveField = action.payload;
    },
  },
});

export const { actions } = elementWizardSlice;
