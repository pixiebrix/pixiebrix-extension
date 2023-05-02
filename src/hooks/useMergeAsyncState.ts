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
  type AsyncValueArray,
  type FetchableAsyncState,
  type FetchableAsyncStateArray,
} from "@/types/sliceTypes";
import memoizeOne from "memoize-one";
import { useCallback, useMemo } from "react";
import { mergeAsyncState } from "@/utils/asyncStateUtils";

/**
 * React hook to merge multiple AsyncState objects into a single AsyncState.
 *
 * Memoizes the merged value, so downstream components can use reference equality on the produced value.
 *
 * @see useDerivedAsyncState
 */
export function useMergeAsyncState<
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
  const dependencies: FetchableAsyncStateArray = args.slice(0, -1);

  // Memoize to avoid re-rendering downstream components
  // @ts-expect-error -- type of memoizeOne covered by test coverage
  const memoizedMerge = useMemo(() => memoizeOne(merge), [merge]);

  const refetchCallbacks = dependencies.map((x) => x.refetch);
  const refetch = useCallback(
    () => {
      for (const refetch of refetchCallbacks) {
        refetch();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depends on individual refetchCallbacks
    refetchCallbacks
  );

  return {
    ...mergeAsyncState(...dependencies, memoizedMerge),
    refetch,
  };
}

export default useMergeAsyncState;
