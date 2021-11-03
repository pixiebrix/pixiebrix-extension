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
  isWizardOpen: boolean;
  savingExtensionUuid: UUID;
};

const initialState: SavingExtensionState = {
  isWizardOpen: false,
  savingExtensionUuid: null,
};

export const savingExtensionSlice = createSlice({
  name: "savingExtension",
  initialState,
  reducers: {
    setWizardOpen: (state, action: PayloadAction<boolean>) => {
      state.isWizardOpen = action.payload;
    },
    setSavingExtension: (state, action: PayloadAction<UUID>) => {
      state.savingExtensionUuid = action.payload;
    },
  },
});

export const { actions } = savingExtensionSlice;
