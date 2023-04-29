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
  FetchableAsyncStateArray,
} from "@/types/sliceTypes";
import { mergeAsyncState } from "@/utils/asyncStateUtils";
import useAsyncState from "@/hooks/useAsyncState";

/**
 * Returns a new AsyncState that is derived from the given AsyncStates.
 * @param args
 */
function useDeriveAsyncState<AsyncStates extends AsyncStateArray, Result>(
  ...args: [
    ...AsyncStateArray,
    (...args: AsyncValueArray<AsyncStates>) => Promise<Result>
  ]
): AsyncState<Result> {
  const promiseState: AsyncState<Promise<Result>> = mergeAsyncState(
    args as any
  );
  const useAsyncState = useAsyncState(promiseState);

  throw new Error("Not implemented");
}

export default useDeriveAsyncState;
