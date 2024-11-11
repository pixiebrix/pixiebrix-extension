/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { useEffect, useRef } from "react";
import deepEquals from "fast-deep-equal";

/**
 * Utility hook to return a referentially stable value if the next value is equal to the previous value.
 * @param next the next value
 * @param compare comparison function to determine whether to return the previous value
 * @param dependencies extra memoization dependencies outside the returned value
 */
function useMemoCompare<T>(
  next: T,
  compare: (previous: T | undefined, next: T) => boolean,
  dependencies?: unknown[],
): T {
  // https://usehooks.com/useMemoCompare/
  // Ref for storing previous value
  const previousRef = useRef<T>();
  const previous = previousRef.current;
  // Pass previous and next value to compare function to determine whether to consider them equal.
  const isEqual = compare(previous, next);
  // If not equal update previousRef to next value. We only update if not equal so that this hook continues to return
  // the same old value if compare keeps returning true.
  useEffect(() => {
    if (!isEqual) {
      previousRef.current = next;
    }
  });

  const previousDependenciesRef = useRef<unknown[] | undefined>();
  const previousDependencies: unknown[] | undefined =
    previousDependenciesRef.current;

  let isDependenciesEqual: boolean;
  if (dependencies === undefined && previousDependencies === undefined) {
    isDependenciesEqual = true;
  } else if (dependencies === undefined || previousDependencies === undefined) {
    isDependenciesEqual = false;
  } else {
    isDependenciesEqual = deepEquals(previousDependencies, dependencies);
  }

  useEffect(() => {
    if (!isDependenciesEqual) {
      previousDependenciesRef.current = dependencies;
    }
  });

  // Finally, if equal, and dependencies have not changed, then return the previous value
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Can't be undefined if it's equal to T
  return isEqual && isDependenciesEqual ? previous! : next;
}

export default useMemoCompare;
