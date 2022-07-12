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

import { useCallback, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { isEmpty } from "lodash";

type Undoable<T> = {
  setUndoableValue: (value: T) => void;
  undo: () => void;
};

const MAX_HISTORY_SIZE = 100;

function useUndo<T>(
  initialValue: T,
  setRealValue: (value: T) => void
): Undoable<T> {
  // Array used like a stack
  const [history, setHistory] = useState<T[]>([]);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  const setHistoryDebounced = useDebouncedCallback(
    (newValue: T) => {
      setHistory((previous) => {
        if (previous.length === MAX_HISTORY_SIZE) {
          previous.pop();
        }

        return [debouncedValue, ...previous];
      });
      setDebouncedValue(newValue);
    },
    300,
    {
      leading: false,
      trailing: true,
      maxWait: 500,
    }
  );

  const setUndoableValue = useCallback(
    (newValue: T) => {
      setHistoryDebounced(newValue);
      setRealValue(newValue);
    },
    [setRealValue, setHistoryDebounced]
  );

  const undo = useCallback(() => {
    if (isEmpty(history)) {
      return;
    }

    const [oldValue, ...newHistory] = history;
    setRealValue(oldValue);
    setHistory(newHistory);
  }, [history, setRealValue]);

  return {
    setUndoableValue,
    undo,
  };
}

export default useUndo;
