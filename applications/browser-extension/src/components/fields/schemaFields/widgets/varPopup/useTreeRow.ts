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

import { type MutableRefObject, useEffect } from "react";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * A hack to make JSON Tree rows clickable/highlightable.
 * @param buttonRef ref for the label in the row
 * @param onSelect callback to call when the row is clicked
 * @param isActive whether the row is currently active
 */
function useTreeRow({
  buttonRef,
  onSelect,
  isActive,
}: {
  buttonRef: MutableRefObject<HTMLElement | null>;
  onSelect: () => void;
  isActive: boolean;
}) {
  useEffect(() => {
    if (buttonRef.current) {
      // Find the containing row in the JSONTree
      const row = buttonRef.current.closest("li");
      assertNotNullish(row, "Could not find row element");

      const controller = new AbortController();
      row.addEventListener(
        "click",
        (event) => {
          // Only call onSelect if the click was on the row itself, not its children
          if (event.target === row) {
            event.preventDefault();
            event.stopPropagation();

            onSelect();
          }
        },
        { signal: controller.signal },
      );

      return () => {
        controller.abort();
      };
    }
  }, [buttonRef, onSelect]);

  useEffect(() => {
    if (buttonRef.current) {
      // Find the containing row in the JSONTree
      const $row = $(buttonRef.current).closest("li");

      if (isActive) {
        $row.addClass("active");

        $row.get(0)?.scrollIntoViewIfNeeded?.();
      } else {
        $row.removeClass("active");
      }
    }
  }, [buttonRef, isActive]);
}

export default useTreeRow;
