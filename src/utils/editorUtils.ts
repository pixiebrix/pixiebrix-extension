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
  type TextEditorElement,
  isTextControlElement,
  isSelectableTextControlElement,
  type SelectableTextEditorElement,
} from "@/types/inputTypes";

/**
 * Returns the current text content of the element to pass to the command handler
 * @param element the text editor element
 */
// In the future, we might decide to only return text up to the cursor position, or provide both full and prior text
export function getElementText(element: TextEditorElement): string {
  if (isTextControlElement(element)) {
    return element.value;
  }

  return $(element).text();
}

/**
 * Replaces the text at the current command with the given text
 * @param element the text editor element
 * @param text the text to insert
 * @param commandKey the command key, e.g., "/"
 */
export async function replaceAtCommand({
  element,
  text,
  commandKey,
}: {
  element: SelectableTextEditorElement;
  text: string;
  commandKey: string;
}): Promise<void> {
  element.focus();

  if (isSelectableTextControlElement(element)) {
    const { selectionStart, value } = element;
    if (selectionStart == null) {
      return;
    }

    const commandStart = value.lastIndexOf(commandKey, selectionStart);
    if (commandStart < 0) {
      // Could happen if field's value was programmatically altered
      throw new Error("Command key not found");
    }

    const endIndex = value.indexOf(" ", commandStart);
    element.setSelectionRange(commandStart, Math.min(endIndex, value.length));
    document.execCommand("insertText", false, text);

    return;
  }

  // Content Editable
  const range = window.getSelection()?.getRangeAt(0);

  if (range?.startContainer.nodeType === Node.TEXT_NODE) {
    const { data } = range.startContainer as Text;

    const commandStart = data.lastIndexOf(commandKey, range.startOffset);
    if (commandStart < 0) {
      // Could happen if field's value was programmatically altered
      throw new Error("Command key not found");
    }

    const endIndex = data.indexOf(" ", commandStart);
    range.setStart(range.startContainer, commandStart);
    range.setEnd(range.startContainer, Math.min(endIndex, data.length));

    // FIXME: this is not deleting the contents of the range or inserting the text
    range.deleteContents();
    document.execCommand("delete", false);
    document.execCommand("insertText", false, text);
  }
}
