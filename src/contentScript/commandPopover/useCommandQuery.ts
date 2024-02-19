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
  type EditableTextElement,
  isContentEditable,
} from "@/contentScript/commandPopover/commandTypes";
import { useEffect, useState } from "react";

const CLEAR_QUERY_KEYS = new Set<string>([" ", "Escape", "Tab"]);

/**
 * Watches an element to determine the active command query.
 * @param commandKey the character to watch for, defaults to "/"
 * @param element the text element to watch
 * @param onHide the callback to hide the command popover
 */
function useCommandQuery({
  commandKey = "/",
  element,
  onHide,
}: {
  commandKey?: string;
  element: EditableTextElement;
  onHide: () => void;
}): Nullishable<string> {
  const [query, setQuery] = useState<Nullishable<string>>(null);

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (CLEAR_QUERY_KEYS.has(event.key)) {
        setQuery(null);
        onHide();
      }

      if (isContentEditable(element)) {
        // Ignore for now
      } else {
        const field = element as HTMLInputElement | HTMLTextAreaElement;

        const queryStart = field.value.lastIndexOf(
          commandKey,
          field.selectionStart - 1,
        );
        // Exclude the COMMAND_CHAR from the query
        setQuery(field.value.slice(queryStart + 1, field.selectionStart));
      }
    };

    // Watch keyup instead of keypress to get backspace
    element.addEventListener("keyup", handleKeyUp);

    return () => {
      element.removeEventListener("keyup", handleKeyUp);
    };
  }, [element, setQuery, onHide, commandKey]);

  return query;
}

export default useCommandQuery;
