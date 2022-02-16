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

import { clearLog, getLog, LogEntry } from "@/background/logging";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isEqual } from "lodash";
import { selectActiveContext } from "./logSelectors";
import { LogState } from "./logViewerTypes";

const REFRESH_INTERVAL = 750;

export const initialLogState: LogState = {
  activeContext: null,
  availableEntries: [],
  entries: [],
  isLoading: false,
};

// Clear the logs in storage for the given context
const clear = createAsyncThunk("logs/clearStatus", async (arg, thunkAPI) => {
  const activeContext = selectActiveContext(thunkAPI.getState() as any);
  if (activeContext != null) {
    await clearLog(activeContext);
  }
});

// Init the logs polling. Should be dispatched once at the start of the app
const pollLogs = createAsyncThunk("logs/polling", async (arg, thunkAPI) => {
  const activeContext = selectActiveContext(thunkAPI.getState() as any);
  let availableEntries: LogEntry[] = [];
  if (activeContext != null) {
    availableEntries = await getLog(activeContext);
  }

  setTimeout(() => thunkAPI.dispatch(pollLogs()), REFRESH_INTERVAL);

  return availableEntries;
});

export const logSlice = createSlice({
  name: "logs",
  initialState: initialLogState,
  reducers: {
    setContext(state, { payload: context }) {
      state.activeContext = context;
      state.availableEntries = [];
      state.entries = [];
      state.isLoading = true;
    },
    refreshEntries(state) {
      state.entries = state.availableEntries;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clear.fulfilled, (state) => {
      state.availableEntries = [];
      state.entries = [];
    });
    builder.addCase(
      pollLogs.fulfilled,
      (state, { payload: availableEntries }) => {
        // Do deep equality check. On the log array of ~3k items it takes only a fraction of a ms.
        // Makes sense to spend some cycles here to save on re-rendering of the children.
        if (!isEqual(state.availableEntries, availableEntries)) {
          // @ts-expect-error -- LogEntry[] is assignable to WritableDraft<LogEntry>[]
          state.availableEntries = availableEntries;
        }

        // If this is the first time we've loaded the log from storage, we want to display all of it.
        if (state.isLoading) {
          state.isLoading = false;
          // @ts-expect-error -- LogEntry[] is assignable to WritableDraft<LogEntry>[]
          state.entries = availableEntries;
        }
      }
    );
  },
});

export const logActions = {
  ...logSlice.actions,
  clear,
  pollLogs,
};
