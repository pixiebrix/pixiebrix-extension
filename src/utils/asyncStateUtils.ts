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
  type FetchableAsyncState,
  type UseCachedQueryResult,
} from "@/types/sliceTypes";
import { noop } from "lodash";
import { type WritableDraft } from "immer/dist/types/types-external";
import { serializeError } from "serialize-error";
import { type Draft } from "immer";

/**
 * Merge multiple async states into a single async state using a synchronous merge function.
 */
export function mergeAsyncState<AsyncStates extends AsyncStateArray, Result>(
  ...args: [
    ...AsyncStateArray,
    (...args: AsyncValueArray<AsyncStates>) => Result
  ]
): AsyncState<Result> {
  // @ts-expect-error -- getting last element
  const mergeFunction: (...args: AsyncValueArray<AsyncStates>) => Result =
    args.at(-1);

  // @ts-expect-error -- getting args except last element
  const states: AsyncStateArray = args.slice(0, -1);

  for (const state of states) {
    checkAsyncStateInvariants(state);
  }

  const isLoading =
    // Something is explicitly loading
    states.some((x) => x.isLoading) ||
    // Some have started/finished loading, and some haven't started
    (states.some((x) => x.isUninitialized) &&
      states.some((x) => !x.isUninitialized));

  // `isLoading` implies isFetching
  const isFetching = isLoading || states.some((x) => x.isFetching);

  // In error state if any of the sub-states are error
  if (states.some((x) => x.isError)) {
    return {
      data: undefined,
      currentData: undefined,
      isUninitialized: false,
      isLoading: false,
      isFetching,
      isError: true,
      isSuccess: false,
      // Return the first error. Could consider merging errors into a composite error
      error: states.find((x) => x.isError)?.error,
    };
  }

  // In success state only if all information is available
  if (states.every((x) => x.isSuccess)) {
    try {
      const data = mergeFunction(...(states.map((x) => x.data) as any));

      // We might consider checking that currentData is not undefined for any of the states instead of using isFetching.
      // That would enable the merged state to include currentData even if the individual states are still fetching.
      // Doing this currently, though has two corner cases:
      // - There's nothing preventing async state producing `undefined` on isSuccess
      // - It might be possible to have an inconsistent view of currentData, as some dependencies will finish fetching
      //  before others. (Although the same issue technically applies to `data` above...)
      const currentData = isFetching
        ? undefined
        : mergeFunction(...(states.map((x) => x.currentData) as any));

      return {
        data,
        currentData: isFetching ? undefined : currentData,
        isUninitialized: false,
        isLoading: false,
        isFetching,
        isError: false,
        isSuccess: true,
        error: undefined,
      };
    } catch (error) {
      return {
        data: undefined,
        currentData: undefined,
        isUninitialized: false,
        isLoading: false,
        isFetching,
        isError: true,
        isSuccess: false,
        error,
      };
    }
  }

  // In intermediate state
  return {
    // XXX: are the data vs. currentData semantics correct here?
    data: undefined,
    currentData: undefined,
    isFetching,
    isUninitialized: states.every((x) => x.isUninitialized),
    isLoading,
    isError: false,
    isSuccess: false,
    error: undefined,
  };
}

/**
 * Helper function that transforms AsyncState to provide a default value. Useful to provide optimistic defaults
 * @param state the async state
 * @param initialValue the value to use if the state is uninitialized or loading
 * @see fallbackValue
 */
export function defaultInitialValue<Value, State extends AsyncState<Value>>(
  state: State,
  initialValue: Value
): State {
  if (state.isUninitialized || state.isLoading) {
    return {
      ...state,
      isUninitialized: false,
      isLoading: false,
      isSuccess: true,
      data: initialValue,
    };
  }

  return state;
}

/**
 * Helper function that transforms AsyncState to provide a fallback value. Used to provide optimistic defaults for
 * loading and error states.
 * @param state the async state
 * @param fallbackValue the value to use if the state is uninitialized or loading
 * @see defaultInitialValue
 */
export function fallbackValue<Value, State extends AsyncState<Value>>(
  state: State,
  fallbackValue: Value
): State {
  if (!state.isSuccess) {
    return {
      // Spread state to get any other inherited properties, e.g., refetch
      ...state,
      ...valueToAsyncState(fallbackValue),
      isFetching: state.isFetching,
      currentData: state.isFetching ? undefined : fallbackValue,
    };
  }

  return state;
}

/**
 * A loading state.
 */
export function uninitializedAsyncStateFactory<Value>(): AsyncState<Value> {
  return {
    isUninitialized: true,
    currentData: undefined,
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    isSuccess: false,
    error: undefined,
  };
}

/**
 * A loading state.
 */
export function loadingAsyncStateFactory<Value>(): AsyncState<Value> {
  return {
    currentData: undefined,
    data: undefined,
    isUninitialized: false,
    isLoading: true,
    isFetching: true,
    isError: false,
    isSuccess: false,
    error: undefined,
  };
}

/**
 * Lift a known value to a FetchableAsyncState.
 * @param value the value
 */
export function valueToAsyncState<Value>(
  value: Value
): FetchableAsyncState<Value> {
  return {
    data: value,
    currentData: value,
    isUninitialized: false,
    isLoading: false,
    isFetching: false,
    isError: false,
    isSuccess: true,
    error: undefined,
    refetch: noop,
  };
}

/**
 * Lift a known value to a FetchableAsyncState.
 * @param error the error
 */
export function errorToAsyncState<Value>(error: unknown): AsyncState<Value> {
  return {
    isError: true,
    error,
    data: undefined,
    currentData: undefined,
    isUninitialized: false,
    isLoading: false,
    isFetching: false,
    isSuccess: false,
  };
}

/**
 * Lift a known value to a UseCachedQueryResult.
 * @param value the value
 * @see UseCachedQueryResult
 */
export function valueToAsyncCacheState<Value>(
  value: Value
): UseCachedQueryResult<Value> {
  return {
    ...valueToAsyncState(value),
    isLoadingFromCache: false,
    isFetchingFromRemote: false,
    isLoadingFromRemote: false,
    isCacheUninitialized: false,
    isRemoteUninitialized: false,
  };
}

/**
 * Throw an error if state has invalid status flag combinations.
 */
export function checkAsyncStateInvariants(state: AsyncState): void {
  if (
    !(
      state.isUninitialized ||
      state.isLoading ||
      state.isFetching ||
      state.isSuccess ||
      state.isError
    )
  ) {
    throw new Error(
      "Expected one of: isUninitialized, isLoading, isFetching, isSuccess, isError"
    );
  }

  if (
    state.isUninitialized &&
    (state.isLoading || state.isFetching || state.isSuccess || state.isError)
  ) {
    throw new Error("Expected only isUninitialized");
  }

  if (state.isLoading && (state.isSuccess || state.isError)) {
    throw new Error("Expected only isLoading");
  }
}

export function setValueOnState<T>(
  state: WritableDraft<AsyncState<T>>,
  value: T
): WritableDraft<AsyncState<T>> {
  // eslint-disable-next-line @typescript-eslint/ban-types -- match types from immer
  state.data = value as T extends object ? Draft<T> : T;
  // eslint-disable-next-line @typescript-eslint/ban-types -- match types from immer
  state.currentData = value as T extends object ? Draft<T> : T;
  state.isUninitialized = false;
  state.isLoading = false;
  state.isFetching = false;
  state.isError = false;
  state.isSuccess = true;
  state.error = undefined;

  return state;
}

export function setErrorOnState<T>(
  state: WritableDraft<AsyncState<T>>,
  error: unknown
): WritableDraft<AsyncState<T>> {
  state.data = undefined;
  state.currentData = undefined;
  state.isUninitialized = false;
  state.isLoading = false;
  state.isFetching = false;
  state.isError = false;
  state.isSuccess = true;
  state.error = serializeError(error, { useToJSON: false });

  return state;
}
