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
 * The set of input types that support selectionStart, selectionEnd, and setSelectionRange.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
 */
const SELECTABLE_INPUT_CONTENT_TYPES = [
  "text",
  "search",
  "url",
  "tel",
  "password",
] as const;

/**
 * The set of input types that support text entry.
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types
 */
const TEXT_INPUT_CONTENT_TYPES = [
  ...SELECTABLE_INPUT_CONTENT_TYPES,
  "email",
] as const;

/**
 * An input element with a text entry field
 */
export type TextInputElement = HTMLInputElement & {
  type: (typeof TEXT_INPUT_CONTENT_TYPES)[number];
};

export type NativeField = HTMLInputElement | HTMLTextAreaElement;

/**
 * A basic text entry element, e.g., an input or textarea element.
 * @see isTextControlElement
 */
export type TextControlElement = TextInputElement | HTMLTextAreaElement;

export type SelectableTextInputElement = TextInputElement & {
  type: (typeof SELECTABLE_INPUT_CONTENT_TYPES)[number];
};

export type SelectableTextControlElement =
  | SelectableTextInputElement
  | HTMLTextAreaElement;

/**
 * A contenteditable HTML element.
 * @see isContentEditableElement
 */
type ContentEditableElement = HTMLElement & ElementContentEditable;

/**
 * A text editor that supports controlling the selection.
 * @see isSelectableTextEditorElement
 */
export type SelectableTextEditorElement =
  | SelectableTextControlElement
  | ContentEditableElement;

/**
 * A text entry element that can be edited by the user, e.g., an input, textarea, or contenteditable element.
 */
// The browser context API uses the terminology "editable": A flag indicating whether the element is editable (text input, textarea, etc.).?
export type TextEditorElement = TextInputElement | ContentEditableElement;

/**
 * Returns true if the element is a native HTML input or textarea element.
 * @param targetOrElement the query element
 */
export function isNativeField(
  targetOrElement: unknown,
): targetOrElement is NativeField {
  return (
    targetOrElement instanceof HTMLInputElement ||
    targetOrElement instanceof HTMLTextAreaElement
  );
}

/**
 * Returns true if the element is a contenteditable HTML element.
 * @param targetOrElement the query element
 */
export function isContentEditableElement(
  targetOrElement: unknown,
): targetOrElement is ContentEditableElement {
  return (
    targetOrElement instanceof HTMLElement && targetOrElement.isContentEditable
  );
}

/**
 * Returns true if the element is a basic text control.
 */
export function isTextControlElement(
  targetOrElement: unknown,
): targetOrElement is TextControlElement {
  if (targetOrElement instanceof HTMLInputElement) {
    return TEXT_INPUT_CONTENT_TYPES.includes(targetOrElement.type ?? "text");
  }

  return targetOrElement instanceof HTMLTextAreaElement;
}

/**
 * Returns true if the element is a basic text control that supports the selection API.
 */
export function isSelectableTextControlElement(
  targetOrElement: unknown,
): targetOrElement is SelectableTextControlElement {
  return (
    isTextControlElement(targetOrElement) &&
    (SELECTABLE_INPUT_CONTENT_TYPES.includes(targetOrElement.type) ||
      targetOrElement instanceof HTMLTextAreaElement)
  );
}

/**
 * Returns true if the input supports managing the selection.
 */
export function isSelectableTextEditorElement(
  targetOrElement: unknown,
): targetOrElement is SelectableTextEditorElement {
  return (
    isSelectableTextControlElement(targetOrElement) ||
    isContentEditableElement(targetOrElement)
  );
}
