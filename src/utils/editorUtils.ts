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

import {
  isTextControlElement,
  type TextEditorElement,
} from "@/types/inputTypes";

/**
 * Returns the current text content of the element, e.g., to pass to the text command popover handler
 * @param element the text editor element
 */
export function getElementText(element: TextEditorElement): string {
  // In the future, we might decide to only return text up to the cursor position, or provide both full and prior text
  if (isTextControlElement(element)) {
    return element.value;
  }

  return $(element).text();
}
