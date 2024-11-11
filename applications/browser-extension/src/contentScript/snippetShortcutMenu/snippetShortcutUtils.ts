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
  isNativeField,
  isSelectableTextControlElement,
  type SelectableTextEditorElement,
} from "@/types/inputTypes";
import { getSelectionRange, waitAnimationFrame } from "@/utils/domUtils";
import { expectContext } from "@/utils/expectContext";
import { insertAtCursorWithCustomEditorSupport } from "@/contentScript/textEditorDom";
import type { Nullishable } from "@/utils/nullishUtils";

/**
 * Replaces the text at the current command + query with the given text
 *
 * @param element the text editor element
 * @param text the text to insert
 * @param commandKey the command key, e.g., "\"
 * @param query the query after the command key. With commandKey, used to determine how much text to replace
 */
export async function replaceAtCommandKey({
  element,
  text,
  query,
  commandKey,
}: {
  element: SelectableTextEditorElement;
  text: string;
  query: string;
  commandKey: string;
}): Promise<void> {
  expectContext(
    "contentScript",
    "contentScript context required for editor integrations",
  );

  element.focus();

  if (isSelectableTextControlElement(element)) {
    const { selectionStart, value } = element;
    if (selectionStart == null) {
      return;
    }

    const commandKeyStart = value.lastIndexOf(commandKey, selectionStart);
    if (commandKeyStart < 0) {
      // Could happen if field's value was programmatically altered
      throw new Error("Command key not found");
    }

    element.setSelectionRange(
      commandKeyStart,
      commandKeyStart + query.length + 1,
    );

    // Ensure the selection update has propagated
    await waitAnimationFrame();

    await insertAtCursorWithCustomEditorSupport(text);

    return;
  }

  if (isNativeField(element)) {
    // Application error because the caller shouldn't call for an invalid field
    throw new Error(`Input type not supported: ${element.type}`);
  }

  // Content Editable
  const range = getSelectionRange();

  if (range?.startContainer.nodeType === Node.TEXT_NODE) {
    if (range.startOffset !== range.endOffset) {
      // Shouldn't happen in practice because snippetShortcutMenuController hides the menu on selection
      throw new Error("Expected a single cursor position");
    }

    const { data } = range.startContainer as Text;

    const commandKeyStart = data.lastIndexOf(commandKey, range.startOffset);
    if (commandKeyStart < 0) {
      // Could happen if field's value was programmatically altered
      throw new Error("Command key not found");
    }

    range.setStart(range.startContainer, commandKeyStart);
    range.setEnd(range.startContainer, commandKeyStart + query.length + 1);

    // Ensure the selection update has propagated
    await waitAnimationFrame();

    const parentElement = range?.startContainer.parentElement;

    if (parentElement == null) {
      throw new Error("Selection has no parent element");
    }

    await insertAtCursorWithCustomEditorSupport(text);
  }
}

/**
 * Remove newlines and excess whitespace from a snippet preview.
 */
export function normalizePreview(preview: Nullishable<string>): string {
  return (preview ?? "No preview available").replaceAll(/\s+/g, " ").trim();
}
