/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { useCallback, useRef } from "react";
import { isEmpty } from "lodash";
import useDebouncedEffect from "@/pageEditor/hooks/useDebouncedEffect";

const MAX_HISTORY_SIZE = 100;

function useUndo<T>(
  realValue: T,
  setRealValue: (value: T) => void
): () => void {
  // Array used like a stack
  const history = useRef<T[]>([]);
  const debouncedValue = useRef(realValue);

  useDebouncedEffect(
    realValue,
    (value) => {
      if (value === debouncedValue.current) {
        return;
      }

      const oldHistory = history.current;
      if (oldHistory.length >= MAX_HISTORY_SIZE) {
        oldHistory.pop();
      }

      history.current = [debouncedValue.current, ...oldHistory];
      debouncedValue.current = value;
    },
    300,
    500
  );

  return useCallback(() => {
    if (isEmpty(history)) {
      return;
    }

    const [oldValue, ...newHistory] = history.current;
    setRealValue(oldValue);
    debouncedValue.current = oldValue;
    history.current = newHistory;
  }, [history, setRealValue]);
}

export default useUndo;
