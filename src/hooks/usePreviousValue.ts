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

/**
 * React hook to get the value of a variable from the previous render.
 * This is useful for comparing the current value of a variable with its previous value
 * to determine how it has changed, and avoids the needs for additional useEffects and state.
 * @param value The value to get the previous value of.
 */
export function usePreviousValue<T>(value: T) {
  const ref = useRef<T | null>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
