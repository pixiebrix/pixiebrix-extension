/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type UUID } from "@/core";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { localStorage } from "redux-persist-webextension-storage";
import { type StorageInterface } from "@/store/StorageInterface";
import { type SessionChangesState } from "@/store/sessionChanges/sessionChangesTypes";

export const initialState: SessionChangesState = {
  latestChanges: {},
};

const key = "sessionChanges";

export const sessionChangesSlice = createSlice({
  name: key,
  initialState,
  reducers: {
    resetSessionChanges() {
      return initialState;
    },
    setSessionChanges(
      state,
      action: PayloadAction<{
        sessionId: UUID;
      }>
    ) {
      const { sessionId } = action.payload;
      // eslint-disable-next-line security/detect-object-injection -- generated UUID
      state.latestChanges[sessionId] = Date.now();
    },
  },
});

export const persistSessionChangesConfig = {
  key,
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 1,
};

export const sessionChangesActions = sessionChangesSlice.actions;

export const sessionChangesStateSyncActions = [`${key}/setSessionChanges`];
