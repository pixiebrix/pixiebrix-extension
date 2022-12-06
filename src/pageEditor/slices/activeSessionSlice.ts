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

import { type UUID } from "@/core";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { localStorage } from "redux-persist-webextension-storage";
import { type StorageInterface } from "@/store/StorageInterface";

export type ActiveSessionState = {
  activeSessionId: UUID | null;
};

export type ActiveSessionRootState = {
  activeSession: ActiveSessionState;
};

const initialState: ActiveSessionState = {
  activeSessionId: null,
};

const key = "activeSession";

export const activeSessionSlice = createSlice({
  name: key,
  initialState,
  reducers: {
    setActiveSessionId(state, action: PayloadAction<UUID>) {
      state.activeSessionId = action.payload;
    },
  },
});

export const persistActiveSessionConfig = {
  key,
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 1,
};

export const activeSessionActions = activeSessionSlice.actions;

export const activeSessionStateSyncActions = [`${key}/setActiveSessionId`];
