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
import { type AsyncState, type FetchableAsyncState } from "@/types/sliceTypes";
import { useCallback, useReducer, useRef } from "react";
import { useAsyncEffect } from "use-async-effect";
import { useIsMounted } from "@/hooks/common";
import { once } from "lodash";
import { uuidv4 } from "@/types/helpers";

type ValueFactory<T> = Promise<T> | (() => Promise<T>);

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

const slice = createSlice({
  name: "asyncSlice",
  initialState: initialAsyncState,
  reducers: {
    // Initialize loading state
    initialize(state) {
      state.isUninitialized = false;
      state.isFetching = true;
      state.isLoading = true;
    },
    startFetchNewInputs(state) {
      // Start fetching for new inputs. Clears currentData because the inputs changed
      state.isFetching = true;
      state.currentData = undefined;
    },
    startRefetch(state) {
      // Start fetching for the same inputs. Keeps currentData because the inputs didn't change
      state.isFetching = true;
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
 * Hook to asynchronously compute a value and return a standard asynchronous state.
 *
 * If you are calculating a value without arguments, you may want to use useAsyncExternalStore instead because it will
 * share state across all instances of the component.
 *
 * @param promiseOrGenerator a promise to await, of function that returns a promise to await
 * @param dependencies zero or more dependencies to trigger a re-fetch
 * @param initialValue the initial value of the state. If provided, the state will be initialized to this value and will
 *  skip the isLoading on the initial value generation.
 * @see useAsyncExternalStore
 */
function useAsyncState<T = unknown>(
  promiseOrGenerator: ValueFactory<T>,
  dependencies: unknown[],
  {
    initialValue,
  }: {
    initialValue?: T;
  } = {}
): FetchableAsyncState<T> {
  // Callback to check if the component is still mounted, to avoid updating state on unmounted React components
  const checkIsMounted = useIsMounted();
  // Ref to track if this is the initial mount
  const initialMountRef = useRef(true);
  // Ref to ensure promise results come back in order
  const promiseNonceRef = useRef(null);
  const [state, dispatch] = useReducer(
    slice.reducer,
    initialValue === undefined
      ? initialAsyncState
      : {
          ...initialAsyncState,
          isUninitialized: false,
          data: initialValue,
          currentData: initialValue,
          isSuccess: true,
        }
  );

  // Effect to automatically refetch when stated dependencies change
  useAsyncEffect(async () => {
    if (initialMountRef.current && initialValue === undefined) {
      dispatch(slice.actions.initialize());
    } else {
      dispatch(slice.actions.startFetchNewInputs());
    }

    const nonce = uuidv4();
    initialMountRef.current = false;
    promiseNonceRef.current = nonce;

    try {
      const promiseResult = await (typeof promiseOrGenerator === "function"
        ? promiseOrGenerator()
        : promiseOrGenerator);

      if (checkIsMounted() && promiseNonceRef.current === nonce) {
        dispatch(slice.actions.success({ data: promiseResult }));
      }
    } catch (error) {
      if (checkIsMounted() && promiseNonceRef.current === nonce) {
        dispatch(slice.actions.failure({ error }));
      }
    }
  }, dependencies);

  const refetch = useCallback(async () => {
    const nonce = uuidv4();
    promiseNonceRef.current = nonce;
    dispatch(slice.actions.startRefetch());
    try {
      const promiseResult = await (typeof promiseOrGenerator === "function"
        ? promiseOrGenerator()
        : promiseOrGenerator);

      if (checkIsMounted() && promiseNonceRef.current === nonce) {
        dispatch(slice.actions.success({ data: promiseResult }));
      }
    } catch (error) {
      if (checkIsMounted() && promiseNonceRef.current === nonce) {
        dispatch(slice.actions.failure({ error }));
      }
    }
  }, [promiseOrGenerator, checkIsMounted]);

  return { ...state, refetch } as FetchableAsyncState<T>;
}

export default useAsyncState;
