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

import { useEffect } from "react";
import { useDebounce } from "use-debounce";
import { isEqual } from "lodash";

/**
 * Hook to run an effect when a value changes, but debounced.
 * @param value the value to watch
 * @param onChange the change handler to run
 * @param delayMillis the delay in milliseconds
 * @param maxWaitMillis maximum wait time in milliseconds
 * @param leading whether to trigger on the leading edge (default = false)
 * @param trailing whether to trigger on the trailing edge (default = true)
 * @param equalityFn the equality function to use (default = isEqual)
 *
 * @see useDebounce
 */
function useDebouncedEffect<T>(
  value: T,
  onChange: (value: T) => void,
  {
    delayMillis,
    maxWaitMillis,
    leading = false,
    trailing = true,
    equalityFn = isEqual,
  }: {
    delayMillis: number;
    maxWaitMillis?: number;
    leading?: boolean;
    trailing?: boolean;
    equalityFn?: (lhs: T, rhs: T) => boolean;
  }
): void {
  const [debounced] = useDebounce(value, delayMillis, {
    leading,
    trailing,
    maxWait: maxWaitMillis,
    equalityFn,
  });

  useEffect(
    () => {
      onChange(debounced);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only watch the debounced value
    [debounced]
  );
}

export default useDebouncedEffect;
