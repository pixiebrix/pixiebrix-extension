/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { clearLog, getLogEntries, type LogEntry } from "@/telemetry/logging";
import { type MessageContext } from "@/types/loggerTypes";
import {
  type ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { isEqual } from "lodash";
import { selectActiveContext } from "./logSelectors";
import { type LogRootState, type LogState } from "./logViewerTypes";
import { castDraft } from "immer";

const REFRESH_INTERVAL = 750;

export const initialLogState: LogState = {
  activeContext: null,
  availableEntries: [],
  entries: [],
  isLoading: false,
};

// Clear the logs in storage for the given context
const clear = createAsyncThunk<void, void, { state: LogRootState }>(
  "logs/clearStatus",
  async (arg, thunkAPI) => {
    const activeContext = selectActiveContext(thunkAPI.getState());
    if (activeContext != null) {
      await clearLog(activeContext);
    }
  },
);

// Init the logs polling. Should be dispatched once at the start of the app
const pollLogs = createAsyncThunk<
  LogEntry[],
  void,
  {
    state: LogRootState;
  }
>("logs/polling", async (arg, thunkAPI) => {
  // TODO
  //  1. Try/catch wrap the logic & set isError and error on the state if there is an error
  //

  const activeContext = selectActiveContext(thunkAPI.getState());
  let availableEntries: LogEntry[] = [];
  if (activeContext != null) {
    availableEntries = await getLogEntries(activeContext);
  }

  setTimeout(async () => thunkAPI.dispatch(pollLogs()), REFRESH_INTERVAL);

  return availableEntries;
});

// Extract extraReducers. Otherwise, TypeScript was failing with "Excessive stack depth comparing types" after
// updating to TypeScript 4.7. Other people seeing issues with TypeScript upgrade:
// https://github.com/microsoft/TypeScript/issues/34933
const extraReducers = (builder: ActionReducerMapBuilder<LogState>) => {
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
        state.availableEntries = castDraft(availableEntries);
      }

      // If this is the first time we've loaded the log from storage, we want to display all of it.
      if (state.isLoading) {
        state.isLoading = false;
        state.entries = castDraft(availableEntries);
      }
    },
  );
};

export const logSlice = createSlice({
  name: "logs",
  initialState: initialLogState,
  reducers: {
    setContext(state, action: PayloadAction<MessageContext>) {
      const { payload: context } = action;
      state.activeContext = context;
      state.availableEntries = [];
      state.entries = [];
      state.isLoading = true;
    },
    refreshEntries(state) {
      state.entries = state.availableEntries;
    },
  },
  extraReducers,
});

export const logActions = {
  ...logSlice.actions,
  clear,
  pollLogs,
};
