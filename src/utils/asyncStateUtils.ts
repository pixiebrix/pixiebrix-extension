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
} from "@/types/sliceTypes";

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

  const isFetching = states.some((x) => x.isFetching);

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
    return {
      data: mergeFunction(...(states.map((x) => x.data) as any)),
      currentData: isFetching
        ? undefined
        : mergeFunction(...(states.map((x) => x.currentData) as any)),
      isUninitialized: false,
      isLoading: false,
      isFetching,
      isError: false,
      isSuccess: true,
      error: undefined,
    };
  }

  // In intermediate state
  return {
    // XXX: are the data vs. currentData semantics correct here?
    data: undefined,
    currentData: undefined,
    isFetching,
    isUninitialized: states.every((x) => x.isUninitialized),
    isLoading: states.some((x) => x.isLoading),
    isError: false,
    isSuccess: false,
    error: undefined,
  };
}

/**
 * Helper function that transforms AsyncState to provide a default value. Useful to provide optimistic values
 * @param state
 * @param initialValue
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
