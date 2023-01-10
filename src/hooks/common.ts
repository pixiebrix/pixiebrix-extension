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

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useAsyncEffect } from "use-async-effect";
import { type Action, type PayloadAction } from "@reduxjs/toolkit";

type StateFactory<T> = Promise<T> | (() => Promise<T>);

export type AsyncState<T> = [
  /**
   * The value, or `undefined` if the state is loading or there was an error computing the state
   */
  T | undefined,
  /**
   * True if the async state is loading/
   */
  boolean,
  /**
   * Error or undefined if there was no error computing the state
   */
  unknown,
  /**
   * Method to re-calculate the value. Does not set `isLoading` flag
   */
  () => Promise<void>
];

type State = {
  data: unknown;
  isLoading: boolean;
  error: unknown;
};

const defaultAsyncState: State = {
  data: undefined,
  isLoading: true,
  error: undefined,
};

// const slice = createSlice({
//   name: "asyncSlice",
//   initialState: defaultAsyncState,
//   reducers: {
//     start(state) {
//       // NOTE: do not set `state.data = undefined` because that would immediately reset the initialState passed into
//       // useAsyncState below
//       state.isLoading = true;
//       state.error = undefined;
//     },
//     success(state, action: PayloadAction<{ data: unknown }>) {
//       state.isLoading = false;
//       state.data = action.payload.data;
//       state.error = undefined;
//     },
//     failure(state, action: PayloadAction<{ error: unknown }>) {
//       state.isLoading = false;
//       state.data = undefined;
//       state.error = action.payload.error ?? "Error producing data";
//     },
//   },
// });

const slice = {
  reducer(
    state: State,
    action:
      | Action
      | PayloadAction<{ data: unknown }>
      | PayloadAction<{ error: unknown }>
  ) {
    state = state ?? defaultAsyncState;

    switch (action.type) {
      case "start": {
        return { ...state, isLoading: true, error: undefined };
      }

      case "success": {
        return {
          isLoading: false,
          data: action.payload.data,
          error: undefined,
        };
      }

      case "failure": {
        return {
          isLoading: false,
          data: undefined,
          error: action.payload.error ?? "Error producing data",
        };
      }

      default: {
        throw new Error("Unknown action", action.type);
      }
    }
  },
  actions: {
    start() {
      return { type: "start" };
    },
    success({ data }: unknown) {
      return { type: "success", payload: { data } };
    },
    failure({ error }: unknown) {
      return { type: "failure", payload: { error } };
    },
  },
};

export function useAsyncState<T>(
  promiseOrGenerator: StateFactory<T>,
  dependencies: unknown[] = [],
  initialState?: T | undefined
): AsyncState<T> {
  const [{ data, isLoading, error }, dispatch] = useReducer(slice.reducer, {
    ...defaultAsyncState,
    isLoading: initialState === undefined,
    data: initialState,
  });

  const recalculate = useCallback(async () => {
    try {
      const promiseResult = await (typeof promiseOrGenerator === "function"
        ? promiseOrGenerator()
        : promiseOrGenerator);
      dispatch(slice.actions.success({ data: promiseResult }));
    } catch (error) {
      dispatch(slice.actions.failure({ error }));
    }
  }, [dispatch, promiseOrGenerator]);

  useAsyncEffect(async (isMounted) => {
    dispatch(slice.actions.start());
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

  return [data as T, isLoading, error, recalculate];
}

export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );
  return () => isMountedRef.current;
}
