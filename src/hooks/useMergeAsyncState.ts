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
  type FetchableAsyncStateArray,
} from "@/types/sliceTypes";
import { once } from "lodash";
import memoizeOne from "memoize-one";
import { useCallback, useMemo, useRef } from "react";
import { mergeAsyncState } from "@/utils/asyncStateUtils";

const warnMergeChange = once(() => {
  console.warn(
    "useMergeAsyncState: merge function changed. This is not supported. Use a constant/memoized function."
  );
});

/**
 * React hook to merge multiple AsyncState objects into a single AsyncState.
 *
 * Memoizes the merged value, so downstream components can use reference equality on the produced value.
 */
function useMergeAsyncState<AsyncStates extends AsyncStateArray, Result>(
  ...args: [
    ...AsyncStateArray,
    (...args: AsyncValueArray<AsyncStates>) => Result
  ]
): AsyncState<Result> {
  // @ts-expect-error -- getting last element
  const merge: (...args: AsyncValueArray<AsyncStates>) => Result = args.at(-1);

  // @ts-expect-error -- getting args except last element
  const states: AsyncStateArray = args.slice(0, -1);

  const mergeRef = useRef(merge);

  if (mergeRef.current !== merge) {
    warnMergeChange();
  }

  // Memoize to avoid re-rendering downstream components
  const memoizedMerge = useMemo(() => memoizeOne(merge), [merge]);

  return mergeAsyncState(...states, memoizedMerge);
}

/**
 * React hook to merge multiple AsyncState objects into a single AsyncState.
 *
 * Memoizes the merged value, so downstream components can use reference equality on the produced value.
 */
export function useFetchableMergeAsyncState<
  AsyncStates extends FetchableAsyncStateArray,
  Result
>(
  ...args: [
    ...FetchableAsyncStateArray,
    (...args: AsyncValueArray<AsyncStates>) => Result
  ]
): FetchableAsyncState<Result> {
  // @ts-expect-error -- getting last element
  const merge: (...args: AsyncValueArray<AsyncStates>) => Result = args.at(-1);

  // @ts-expect-error -- getting args except last element
  const states: FetchableAsyncStateArray = args.slice(0, -1);

  const mergeRef = useRef(merge);

  if (mergeRef.current !== merge) {
    warnMergeChange();
  }

  // Memoize to avoid re-rendering downstream components
  const memoizedMerge = useMemo(() => memoizeOne(merge), [merge]);

  const refetches = states.map((x) => x.refetch);
  const refetch = useCallback(
    () => {
      for (const refetch of refetches) {
        refetch();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depends on individual refetches
    refetches
  );

  return {
    ...mergeAsyncState(...states, memoizedMerge),
    refetch,
  };
}

export default useMergeAsyncState;
