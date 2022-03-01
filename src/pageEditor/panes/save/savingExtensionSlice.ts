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

import { createSlice } from "@reduxjs/toolkit";

export type SavingExtensionState = {
  /**
   * Defines the state of the Modal window.
   * This includes loading and saving states, and user dialogs.
   */
  isWizardOpen: boolean;

  /**
   * Is TRUE only when the saving is actually in progress.
   * When a modal with saving options is open this property is FALSE.
   */
  isSaving: boolean;
};

const initialState: SavingExtensionState = {
  isWizardOpen: false,
  isSaving: false,
};

export const savingExtensionSlice = createSlice({
  name: "savingExtension",
  initialState,
  reducers: {
    openWizard: (state) => {
      state.isWizardOpen = true;
    },
    setSavingInProgress: (state) => {
      state.isSaving = true;
    },
    /**
     * Closes the Wizard and also disables isSaving flag
     */
    closeWizard: (state) => {
      state.isWizardOpen = false;
      state.isSaving = false;
    },
  },
});

export const { actions } = savingExtensionSlice;
