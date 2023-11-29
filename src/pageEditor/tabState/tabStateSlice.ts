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

import { uuidv4 } from "@/types/helpers";
import { thisTab } from "@/pageEditor/utils";
import { ensureContentScript } from "@/background/messenger/api";
import { onContextInvalidated } from "@/errors/contextInvalidated";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  type FrameConnectionState,
  type TabState,
  type TabStateRootState,
} from "@/pageEditor/tabState/tabStateTypes";
import { type EditorRootState } from "@/pageEditor/pageEditorTypes";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { actions } from "@/pageEditor/slices/editorSlice";
import { canAccessTab } from "@/permissions/permissionsUtils";
import { serializeError } from "serialize-error";
import { BusinessError } from "@/errors/businessErrors";
import reportError from "@/telemetry/reportError";

const defaultFrameState: FrameConnectionState = {
  navSequence: undefined,
  hasPermissions: false,
  frameId: 0,
};

const initialTabState: TabState = {
  isConnecting: false,
  frameState: defaultFrameState,
  error: null,
};

export const CONTEXT_INVALIDATED_MESSAGE =
  "PixieBrix was updated or restarted. Please reload 1) the Browser Tab, and then 2) the Page Editor to continue.";

/**
 * This thunk is long-running. It waits for the page's chrome runtime context
 * to be invalidated, and then resolves with an error.
 */
const awaitContextInvalidated = createAsyncThunk<
  void,
  void,
  { state: TabStateRootState }
>("tabState/awaitContextInvalidated", async () => {
  await onContextInvalidated();
});

const connectToContentScript = createAsyncThunk<
  FrameConnectionState,
  void,
  // We need to include these states to enable dispatching the availability async thunk actions
  { state: TabStateRootState & EditorRootState & ModComponentsRootState }
>("tabState/connectToContentScript", async (_, thunkAPI) => {
  const uuid = uuidv4();
  const common = { ...defaultFrameState, navSequence: uuid };

  console.debug(`connectToContentScript: connecting for ${uuid}`);
  if (!(await canAccessTab(thisTab))) {
    console.debug("connectToFrame: cannot access tab");
    return common;
  }

  console.debug("connectToContentScript: ensuring contentScript");
  await ensureContentScript(thisTab, 4500);

  void thunkAPI.dispatch(awaitContextInvalidated());
  void thunkAPI.dispatch(actions.checkAvailableDynamicElements());
  void thunkAPI.dispatch(actions.checkAvailableInstalledExtensions());

  console.debug(`connectToContentScript: replacing tabState for ${uuid}`);
  return {
    ...common,
    hasPermissions: true,
  };
});

export const tabStateSlice = createSlice({
  name: "tabState",
  initialState: initialTabState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(connectToContentScript.pending, (state) => {
        state.isConnecting = true;
        // Null-out the error every time this is pending, but don't clear the
        // frame state, so that the previous result is still available while loading
        state.error = null;
      })
      .addCase(
        connectToContentScript.fulfilled,
        (state, { payload: frameState }) => {
          state.isConnecting = false;
          state.frameState = frameState;
        },
      )
      .addCase(connectToContentScript.rejected, (state, { error }) => {
        state.isConnecting = false;
        state.frameState = defaultFrameState;
        state.error = serializeError(error);
        reportError(error);
      })
      .addCase(awaitContextInvalidated.fulfilled, (state) => {
        state.isConnecting = false;
        state.frameState = defaultFrameState;
        const error = new BusinessError(CONTEXT_INVALIDATED_MESSAGE);
        state.error = serializeError(error);
      });
  },
});

export const tabStateActions = {
  ...tabStateSlice.actions,
  connectToContentScript,
};
