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

/**
 * @file Types to simplify working with text editor-like elements.
 * @since 1.8.10
 */

/**
 * A basic text entry element, e.g., an input or textarea element.
 * @see isBasicTextField
 */
// XXX: consider refining the HTMLInputElement type only include textual input types on the `type` field
export type HTMLBasicTextField = HTMLInputElement | HTMLTextAreaElement;

/**
 * The set of input types that support selectionStart, selectionEnd, and setSelectionRange.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
 */
const SELECTABLE_INPUT_CONTENT_TYPES: readonly string[] = [
  "text",
  "search",
  "url",
  "tel",
  "password",
];

export type HTMLSelectableInputField = HTMLInputElement & {
  type: (typeof SELECTABLE_INPUT_CONTENT_TYPES)[number];
};

export type HTMLSelectableTextEditor =
  | HTMLSelectableInputField
  | (HTMLElement & ElementContentEditable);

/**
 * A text entry element that can be edited by the user, e.g., an input, textarea, or contenteditable element.
 * @see isTextEditorElement
 */
export type HTMLTextEditorElement =
  | HTMLBasicTextField
  | (HTMLElement & ElementContentEditable);

/**
 * Returns true if the element is a contenteditable HTML element.
 * @param targetOrElement the query element
 */
export function isContentEditable(
  targetOrElement: unknown,
): targetOrElement is HTMLElement & ElementContentEditable {
  return (
    targetOrElement instanceof HTMLElement && targetOrElement.isContentEditable
  );
}

/**
 * Returns true if the element is a basic text control.
 * @param targetOrElement
 */
export function isBasicTextField(
  targetOrElement: unknown,
): targetOrElement is HTMLBasicTextField {
  if (targetOrElement instanceof HTMLTextAreaElement) {
    return true;
  }

  return (
    targetOrElement instanceof HTMLInputElement ||
    targetOrElement instanceof HTMLTextAreaElement
  );
}

/**
 * Returns true if the element is an input, textarea, or contenteditable element.
 */
export function isTextEditorElement(
  targetOrElement: unknown,
): targetOrElement is HTMLTextEditorElement {
  return (
    isBasicTextField(targetOrElement) || isContentEditable(targetOrElement)
  );
}

/**
 * Returns true if the element is a basic text control that supports the selection API.
 */
export function isSelectableInputField(
  targetOrElement: unknown,
): targetOrElement is HTMLSelectableInputField {
  return (
    isBasicTextField(targetOrElement) &&
    (SELECTABLE_INPUT_CONTENT_TYPES.includes(targetOrElement.type) ||
      targetOrElement.tagName === "TEXTAREA")
  );
}

/**
 * Returns true if the input supports managing the selection.
 */
export function isSelectableTextEditor(
  targetOrElement: unknown,
): targetOrElement is HTMLSelectableTextEditor {
  return (
    isSelectableInputField(targetOrElement) ||
    isContentEditable(targetOrElement)
  );
}
