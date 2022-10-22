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

import pTimeout from "p-timeout";
import { FrameworkMeta } from "@/messaging/constants";
import { uuidv4 } from "@/types/helpers";
import { thisTab } from "@/pageEditor/utils";
import { detectFrameworks } from "@/contentScript/messenger/api";
import { ensureContentScript } from "@/background/messenger/api";
import { canAccessTab } from "webext-tools";
import { onContextInvalidated } from "@/errors/contextInvalidated";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isSpecificError } from "@/errors/errorHelpers";
import { TimeoutError } from "@/utils";
import {
  FrameConnectionState,
  TabState,
  TabStateRootState,
} from "@/pageEditor/tabState/tabStateTypes";
import { EditorRootState } from "@/pageEditor/pageEditorTypes";
import { ExtensionsRootState } from "@/store/extensionsTypes";
import { actions } from "@/pageEditor/slices/editorSlice";

const defaultFrameState: FrameConnectionState = {
  navSequence: undefined,
  hasPermissions: false,
  meta: undefined,
  frameId: 0,
};

const initialTabState: TabState = {
  isConnecting: false,
  frameState: defaultFrameState,
  error: null,
};

const connectToContentScript = createAsyncThunk<
  FrameConnectionState,
  void,
  // We need to include these states to enable dispatching the availability async thunk actions
  { state: TabStateRootState & EditorRootState & ExtensionsRootState }
>("tabState/connectToContentScript", async (_, thunkAPI) => {
  const uuid = uuidv4();
  const common = { ...defaultFrameState, navSequence: uuid };

  console.debug(`connectToContentScript: connecting for ${uuid}`);
  if (!(await canAccessTab(thisTab))) {
    console.debug("connectToFrame: cannot access tab");
    return common;
  }

  console.debug("connectToContentScript: ensuring contentScript");
  try {
    await ensureContentScript(thisTab, 4500);
  } catch (error) {
    if (isSpecificError(error, TimeoutError)) {
      throw new TimeoutError(
        "The Page Editor could not establish a connection to the page",
        { cause: error }
      );
    }

    throw error;
  }

  let frameworks: FrameworkMeta[] = [];
  try {
    console.debug("connectToContentScript: detecting frameworks");
    frameworks = await pTimeout(detectFrameworks(thisTab, null), {
      milliseconds: 500,
    });
  } catch (error) {
    console.debug("connectToContentScript: error detecting frameworks", {
      error,
    });
  }

  void thunkAPI.dispatch(awaitContextInvalidated());
  void thunkAPI.dispatch(actions.checkAvailableDynamicElements());
  void thunkAPI.dispatch(actions.checkAvailableInstalledExtensions());

  console.debug(`connectToContentScript: replacing tabState for ${uuid}`);
  return {
    ...common,
    hasPermissions: true,
    meta: { frameworks },
  };
});

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
        }
      )
      .addCase(connectToContentScript.rejected, (state, { error }) => {
        state.isConnecting = false;
        state.frameState = defaultFrameState;
        state.error = error.message;
      })
      .addCase(awaitContextInvalidated.fulfilled, (state) => {
        state.isConnecting = false;
        state.frameState = defaultFrameState;
        state.error =
          "PixieBrix was updated or restarted. Reload the Page Editor to continue.";
      });
  },
});

export const tabStateActions = {
  ...tabStateSlice.actions,
  connectToContentScript,
};
