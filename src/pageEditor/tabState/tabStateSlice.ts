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
import { getErrorMessage, isErrorObject } from "@/errors/errorHelpers";
import reportError from "@/telemetry/reportError";
import { uuidv4 } from "@/types/helpers";
import { thisTab } from "@/pageEditor/utils";
import { detectFrameworks } from "@/contentScript/messenger/api";
import { ensureContentScript } from "@/background/messenger/api";
import { canAccessTab } from "webext-tools";
import { sleep } from "@/utils";
import { onContextInvalidated } from "@/errors/contextInvalidated";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  FrameConnectionState,
  TabState,
  TabStateRootState,
} from "@/pageEditor/tabState/tabStateTypes";

const defaultFrameState: FrameConnectionState = {
  navSequence: undefined,
  hasPermissions: false,
  meta: undefined,
  frameId: 0,
};

const initialTabState: TabState = {
  isConnecting: false,
  frameState: defaultFrameState,
};

const connectToContentScript = createAsyncThunk<
  FrameConnectionState,
  void,
  { state: TabStateRootState }
>("tabState/connectToContentScript", async (arg, thunkAPI) => {
  const uuid = uuidv4();
  const common = { ...defaultFrameState, navSequence: uuid };

  console.debug(`connectToContentScript: connecting for ${uuid}`);
  if (!(await canAccessTab(thisTab))) {
    console.debug("connectToFrame: cannot access tab");
    return common;
  }

  console.debug("connectToContentScript: ensuring contentScript");
  const firstTimeout = Symbol("firstTimeout");
  const contentScript = ensureContentScript(thisTab, 15_000);
  const result = await Promise.race([
    sleep(4000).then(() => firstTimeout),
    contentScript,
  ]);

  if (result === firstTimeout) {
    throw new Error(
      "The Page Editor could not establish a connection to the page, retrying…"
    );
  }

  try {
    await contentScript;
  } catch (error) {
    const errorMessage =
      isErrorObject(error) && error.name === "TimeoutError"
        ? "The Page Editor could not establish a connection to the content script"
        : getErrorMessage(error);
    reportError(error);
    throw new Error(errorMessage, { cause: error });
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

  // We want to dispatch this for a successful connection, but we don't want
  // to block the current thunk from resolving (awaitContextInvalidated is a
  // long-running thunk)
  void thunkAPI.dispatch(awaitContextInvalidated());

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
  Error,
  void,
  { state: TabStateRootState }
>("tabState/awaitContextInvalidated", async () => {
  await onContextInvalidated();
  return new Error(
    "PixieBrix was updated or restarted. Reload the Page Editor to continue."
  );
});

export const tabStateSlice = createSlice({
  name: "tabState",
  initialState: initialTabState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(connectToContentScript.pending, (state) => {
        state.isConnecting = true;
        state.error = undefined;
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
        state.error = error;
      })
      .addCase(
        awaitContextInvalidated.fulfilled,
        (state, { payload: error }) => {
          state.isConnecting = false;
          state.frameState = defaultFrameState;
          state.error = error;
        }
      );
  },
});

export const tabStateActions = {
  ...tabStateSlice.actions,
  connectToContentScript,
};
