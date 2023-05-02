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

import {
  type AsyncState,
  type AsyncStateArray,
  type AsyncValueArray,
  type FetchableAsyncStateArray,
} from "@/types/sliceTypes";
import { once } from "lodash";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useIsMounted } from "@/hooks/common";
import { useReducer, useRef } from "react";
import { useAsyncEffect } from "use-async-effect";
import { checkAsyncStateInvariants } from "@/utils/asyncStateUtils";

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

const warnNullValueOnce = once(() => {
  // This will warn once per module -- not once per instance of useAsyncState. We might want to track in the slice
  // instead. But this is sufficient for now, and keeps the reducer state clean.
  console.warn(
    "useAsyncState:promiseOrGenerator produced a null value. Avoid returning null for async state values."
  );
});

const promiseSlice = createSlice({
  name: "promiseSlice",
  initialState: initialAsyncState,
  reducers: {
    initialize(state) {
      // Initial promise loading state
      state.isUninitialized = false;
      state.isFetching = true;
      state.isLoading = true;
    },
    startFetchNewInputs(state) {
      // Start fetching due to new inputs
      state.isFetching = true;
      state.currentData = undefined;
    },
    success(state, action: PayloadAction<{ data: unknown }>) {
      const { data } = action.payload;

      if (data == null) {
        // Warn on null values because they're ambiguous downstream on if the state is loading vs. the produced value
        // is null. It's error-prone.
        warnNullValueOnce();
      }

      state.isLoading = false;
      state.isFetching = false;
      state.data = data;
      state.currentData = data;
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

/**
 * Returns a new AsyncState that is asynchronously derived from the given AsyncStates.
 *
 * The hook does not support a "refetch" method, as it's not currently possible to detect when the dependencies are
 * done re-fetching if their `data` field hasn't changed. If needed in the future, could try implementing by adding
 * fulfillment timestamps or a nonce on AsyncState.
 *
 * @see useMergeAsyncState
 */
function useDeriveAsyncState<AsyncStates extends AsyncStateArray, Result>(
  ...args: [
    ...AsyncStateArray,
    (...args: AsyncValueArray<AsyncStates>) => Promise<Result>
  ]
): AsyncState<Result> {
  // Ref to track if this is the initial mount
  const initialMountRef = useRef(true);

  // Callback to check if the component is still mounted, to avoid updating state on unmounted React components
  const checkIsMounted = useIsMounted();

  // @ts-expect-error -- getting last element
  const merge: (...args: AsyncValueArray<AsyncStates>) => Promise<Result> =
    args.at(-1);

  const [promiseState, dispatch] = useReducer(
    promiseSlice.reducer,
    initialAsyncState
  );

  // @ts-expect-error -- getting args except last element
  const states: FetchableAsyncStateArray = args.slice(0, -1);

  for (const state of states) {
    checkAsyncStateInvariants(state);
  }

  const datums = states.map((x) => x.data);

  // Effect to automatically refetch when stated dependencies change
  useAsyncEffect(async () => {
    if (!states.every((x) => x.isSuccess)) {
      return;
    }

    if (initialMountRef.current) {
      dispatch(promiseSlice.actions.initialize());
    } else {
      dispatch(promiseSlice.actions.startFetchNewInputs());
    }

    initialMountRef.current = false;

    try {
      const promiseResult = await merge(...(datums as any));
      if (checkIsMounted()) {
        dispatch(promiseSlice.actions.success({ data: promiseResult }));
      }
    } catch (error) {
      if (checkIsMounted()) {
        dispatch(promiseSlice.actions.failure({ error }));
      }
    }
  }, datums);

  const isLoading =
    // Any dependencies are loading
    states.some((x) => x.isLoading) ||
    // Some dependencies have kicked off, but others have not
    (states.some((x) => x.isUninitialized) &&
      states.some((x) => !x.isUninitialized)) ||
    // Dependencies have completed, but derived promise has not started
    (states.every((x) => x.isSuccess) && promiseState.isUninitialized) ||
    // Derived promise is loading
    promiseState.isLoading;

  const isFetching =
    // `isLoading` implies isFetching
    isLoading || states.some((x) => x.isFetching) || promiseState.isFetching;

  // The overall state is uninitialized only if none of the substates have stated calculating
  const isUninitialized = states.every((x) => x.isUninitialized);

  // In error state if the final promise is an error
  if (promiseState.isError) {
    return {
      data: undefined,
      currentData: undefined,
      isUninitialized: false,
      isLoading: false,
      isFetching,
      isError: true,
      isSuccess: false,
      error: promiseState.error,
    };
  }

  // Or, in error state if any of the dependencies are errors
  if (states.some((x) => x.isError)) {
    return {
      data: undefined,
      currentData: undefined,
      isUninitialized: false,
      isLoading: false,
      isFetching,
      isError: true,
      isSuccess: false,
      // Return an arbitrary error. Could consider merging errors into a composite error
      error: states.find((x) => x.isError)?.error,
    };
  }

  if (promiseState.isSuccess) {
    return {
      data: promiseState.data as Result,
      // `useDeriveAsyncState` doesn't support refetch, so currentData is always the same as data when not fetching
      currentData: isFetching ? undefined : (promiseState.data as Result),
      isUninitialized: false,
      isLoading: false,
      isFetching,
      isError: false,
      isSuccess: true,
      error: undefined,
    };
  }

  if (!(isLoading || isUninitialized || isFetching)) {
    console.error("Invalid async state", { states, promiseState });
    throw new Error("Invalid async state");
  }

  // Hasn't resolved any errors or successes yet
  return {
    data: undefined,
    currentData: undefined,
    isLoading,
    isFetching,
    isUninitialized,
    isError: false,
    isSuccess: false,
    error: undefined,
  };
}

export default useDeriveAsyncState;
