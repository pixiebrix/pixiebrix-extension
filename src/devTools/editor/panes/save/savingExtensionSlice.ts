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

import { UUID } from "@/core";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SavingExtensionState = {
  /**
   * Defines the state of the Modal window.
   * This includes loading and saving states, and user dialogs.
   */
  isWizardOpen: boolean;

  /**
   * Id of the extension being saved.
   * Is set only when the saving process is actually in progress.
   * When a modal with saving options is open this property is null.
   */
  savingExtensionId: UUID | null;
};

const initialState: SavingExtensionState = {
  isWizardOpen: false,
  savingExtensionId: null,
};

export const savingExtensionSlice = createSlice({
  name: "savingExtension",
  initialState,
  reducers: {
    openWizard: (state) => {
      state.isWizardOpen = true;
    },
    setSavingExtension: (state, action: PayloadAction<UUID>) => {
      state.savingExtensionId = action.payload;
    },
    closeWizard: (state) => {
      state.isWizardOpen = false;
      state.savingExtensionId = null;
    },
  },
});

export const { actions } = savingExtensionSlice;
