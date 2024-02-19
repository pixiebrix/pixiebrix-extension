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
import { useEffect, useRef, useState } from "react";

const CLEAR_QUERY_KEYS = new Set<string>([" ", "Escape"]);
const SUBMIT_QUERY_KEYS = new Set<string>(["Enter", "Tab"]);

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
 * Watches keyboard interaction with an element to determine a command search query
 * @param commandKey the character to watch for, defaults to "/"
 * @param element the text element to watch
 * @param onSubmitRef callback to select a command
 * @param onOffset callback to offset the selected command
 */
function useKeyboardQuery({
  commandKey = "/",
  element,
  onSubmit,
  onOffset,
}: {
  commandKey?: string;
  element: HTMLTextEditorElement;
  onSubmit: () => void;
  onOffset: (offset: number) => void;
}): Nullishable<string> {
  const [query, setQuery] = useState<Nullishable<string>>(null);
  const queryRef = useRef<Nullishable<string>>(null);
  // Use ref to avoid re-running effect
  const onSubmitRef = useRef(onSubmit);
  const onOffsetRef = useRef(onOffset);

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (CLEAR_QUERY_KEYS.has(event.key)) {
        setQuery(null);
      } else {
        const activeQuery = selectActiveQuery({ element, commandKey });
        setQuery(activeQuery);
        // Make instantly (outside of React lifecycle) available for keydown event
        queryRef.current = activeQuery;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // No active query, so let the user type normally
      if (queryRef.current == null) {
        return;
      }

      if (SUBMIT_QUERY_KEYS.has(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        onSubmitRef.current();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        onOffsetRef.current(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        onOffsetRef.current(1);
      }
    };

    // Hijacking events for the popover
    element.addEventListener("keydown", handleKeyDown, {
      capture: true,
      passive: false,
    });

    // Watch keyup instead of keypress to get backspace
    element.addEventListener("keyup", handleKeyUp, { passive: true });

    return () => {
      element.removeEventListener("keydown", handleKeyDown);
      element.removeEventListener("keyup", handleKeyUp);
    };
  }, [element, setQuery, commandKey, onSubmitRef, onOffsetRef]);

  return query;
}

export default useKeyboardQuery;
