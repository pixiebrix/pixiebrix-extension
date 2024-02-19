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

import type { Nullishable } from "@/utils/nullishUtils";
import {
  type HTMLTextEditorElement,
  isSelectableInputField,
} from "@/types/inputTypes";
import { useEffect, useState } from "react";

const CLEAR_QUERY_KEYS = new Set<string>([" ", "Escape", "Tab"]);
const SUBMIT_QUERY_KEYS = new Set<string>(["Enter"]);

/**
 * Select the active query based on the current cursor position/selection
 * @param field
 * @param commandKey
 */
function selectActiveQuery({
  element,
  commandKey,
}: {
  element: HTMLTextEditorElement;
  commandKey: string;
}): Nullishable<string> {
  if (isSelectableInputField(element)) {
    const { selectionStart, value } = element;
    if (selectionStart == null) {
      return null;
    }

    const queryStart = value.lastIndexOf(commandKey, selectionStart);

    if (queryStart >= 0) {
      // Exclude the commandKey from the query
      return value.slice(queryStart + 1, selectionStart);
    }

    return null;
  }

  // TODO: handle contenteditable
  return null;
}

/**
 * Watches an element to determine the active command query.
 * @param commandKey the character to watch for, defaults to "/"
 * @param element the text element to watch
 * @param onHide the callback to hide the command popover
 * @param onSelect the callback to select a command
 * @param onOffset the callback to offset the selected command
 */
function useCommandQuery({
  commandKey = "/",
  element,
  onHide,
  onSelect,
  onOffset,
}: {
  commandKey?: string;
  element: HTMLTextEditorElement;
  onHide: () => void;
  onSelect: (query: string) => void;
  onOffset: (offset: number) => void;
}): Nullishable<string> {
  const [query, setQuery] = useState<Nullishable<string>>(null);

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (CLEAR_QUERY_KEYS.has(event.key)) {
        setQuery(null);
        onHide();
      } else {
        setQuery(selectActiveQuery({ element, commandKey }));
      }
    };

    const handleSubmit = (event: KeyboardEvent) => {
      const query = selectActiveQuery({ element, commandKey });

      // No active query, so let the user type normally
      if (query == null) {
        return;
      }

      if (SUBMIT_QUERY_KEYS.has(event.key)) {
        // Use enter for submit instead of newline
        event.preventDefault();
        event.stopPropagation();
        onSelect(query);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        onOffset(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        onOffset(1);
      }
    };

    // Hijacking events for the popover
    element.addEventListener("keydown", handleSubmit, {
      capture: true,
      passive: false,
    });
    // Watch keyup instead of keypress to get backspace
    element.addEventListener("keyup", handleKeyUp);

    return () => {
      element.removeEventListener("keydown", handleSubmit);
      element.removeEventListener("keyup", handleKeyUp);
    };
  }, [element, setQuery, onHide, onSelect, commandKey, onOffset]);

  return query;
}

export default useCommandQuery;
