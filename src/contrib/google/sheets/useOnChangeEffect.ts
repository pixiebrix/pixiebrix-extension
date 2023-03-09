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

import { useEffect, useRef } from "react";

/**
 * Hook to run a side effect when a value changes.
 * @param value the value to watch
 * @param effect the side effect to run
 * @param isEqual the equality function to use to determine if the value has changed, or undefined to use reference equality
 * @deprecated should avoid using this pattern because it can cause infinite re-renders
 */
export function useOnChangeEffect<T = unknown>(
  value: T,
  effect: (newValue: T, oldValue: T) => void,
  isEqual?: (a: T, b: T) => boolean
): void {
  const valueRef = useRef(value);

  useEffect(() => {
    const equal = isEqual ?? Object.is;
    if (!equal(value, valueRef.current)) {
      effect(value, valueRef.current);
      valueRef.current = value;
    }
  }, [value, valueRef, effect, isEqual]);
}
