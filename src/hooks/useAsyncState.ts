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

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type AsyncState } from "@/types/sliceTypes";
import { useReducer, useRef } from "react";
import { useAsyncEffect } from "use-async-effect";

type StateFactory<T> = Promise<T> | (() => Promise<T>);

const initialAsyncState: AsyncState = {
  data: undefined,
  currentData: undefined,
  isUninitialized: true,
  isLoading: false,
  isFetching: false,
  isError: false,
  isSuccess: false,
  error: undefined,
};

const slice = createSlice({
  name: "asyncSlice",
  initialState: initialAsyncState,
  reducers: {
    init(state) {
      state.isUninitialized = false;
      state.isFetching = true;
      state.isLoading = true;
    },
    start(state) {
      // NOTE: do not set `state.data = undefined` because that would immediately reset the initialState passed into
      // useAsyncState below
      state.isFetching = true;
      state.currentData = undefined;
    },
    success(state, action: PayloadAction<{ data: unknown }>) {
      state.isLoading = false;
      state.isFetching = false;
      state.data = action.payload.data;
      state.currentData = action.payload.data;
      state.isError = false;
      state.isSuccess = true;
      state.error = undefined;
    },
    failure(state, action: PayloadAction<{ error: unknown }>) {
      state.isLoading = false;
      state.isFetching = false;
      state.data = undefined;
      state.isError = true;
      state.isSuccess = false;
      state.error = action.payload.error ?? new Error("Error producing data");
    },
  },
});

function useAsyncState<T = unknown>(
  promiseOrGenerator: StateFactory<T>,
  dependencies: unknown[]
): AsyncState<T> {
  const initialMountRef = useRef(true);
  const [state, dispatch] = useReducer(slice.reducer, initialAsyncState);

  useAsyncEffect(async (isMounted) => {
    if (initialMountRef.current) {
      dispatch(slice.actions.init());
    } else {
      dispatch(slice.actions.start());
    }

    initialMountRef.current = false;

    try {
      const promiseResult = await (typeof promiseOrGenerator === "function"
        ? promiseOrGenerator()
        : promiseOrGenerator);
      if (!isMounted()) return;
      dispatch(slice.actions.success({ data: promiseResult }));
    } catch (error) {
      if (isMounted()) {
        dispatch(slice.actions.failure({ error }));
      }
    }
  }, dependencies);

  return state as AsyncState<T>;
}

export default useAsyncState;
