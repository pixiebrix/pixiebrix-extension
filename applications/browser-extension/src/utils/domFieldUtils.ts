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

import { setCKEditorData } from "../pageScript/messenger/api";
import { getSelectorForElement } from "../contentScript/elementReference";
import { hasCKEditorClass } from "../contrib/ckeditor/ckeditorDom";
import { boolean } from "./typeUtils";
import { isDraftJsField, setDraftJs } from "../contrib/draftjs/draftJsDom";

export type FieldElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

export function isFieldElement(
  element: HTMLElement | Document,
): element is FieldElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return (
    element.isContentEditable ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

const OPTION_FIELDS = new Set(["checkbox", "radio"]);

export async function setFieldsValue(
  fields: FieldElement[],
  value: unknown,
  {
    dispatchEvent,
    isNameBased,
  }: { dispatchEvent: boolean; isNameBased: boolean },
) {
  // Exact matches will be picked out of many, otherwise we'll treat them as booleans
  const isOption =
    isNameBased &&
    fields.some(
      (field) => field.value === value && OPTION_FIELDS.has(field.type),
    );

  return Promise.all(
    fields.map(async (field) =>
      setFieldValue(field, value, { dispatchEvent, isOption }),
    ),
  );
}

export async function setFieldValue(
  field: FieldElement,
  value: unknown,
  {
    dispatchEvent,
    isOption,
  }: { dispatchEvent?: boolean; isOption?: boolean } = {},
): Promise<void> {
  // For performance, use the contentScript-based call to determine if the element has the classname associate with
  // CKEditor 5 instances. If it does, set the data (will error if it's not actually a CKEditor 5 instance).
  if (hasCKEditorClass(field)) {
    await setCKEditorData({
      selector: getSelectorForElement(field),
      value: String(value),
    });
    return;
  }

  if (isDraftJsField(field)) {
    await setDraftJs(field, String(value));
    return;
  }

  if (field.isContentEditable) {
    // XXX: Maybe use text-field-edit so that the focus is not altered

    // Field needs to be focused first
    field.focus();

    // `insertText` acts as a "paste", so if no text is selected it's just appended
    document.execCommand("selectAll", false);

    // It automatically triggers an `input` event
    document.execCommand("insertText", false, String(value));

    return;
  }

  // `instanceof` is there as a type guard only
  if (
    !OPTION_FIELDS.has(field.type) ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    // Plain text field
    field.value = String(value);
  } else if (isOption) {
    // Value-based radio/checkbox
    field.checked = field.value === value;
  } else {
    // Boolean checkbox
    field.checked = boolean(value);
  }

  if (dispatchEvent) {
    if (
      !(OPTION_FIELDS.has(field.type) || field instanceof HTMLSelectElement)
    ) {
      // Browsers normally fire these text events while typing
      field.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
      field.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true }));
      field.dispatchEvent(new CompositionEvent("textInput", { bubbles: true }));
      field.dispatchEvent(new InputEvent("input", { bubbles: true }));
      field.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    }

    // Browsers normally fire this on `blur` if it's a text field, otherwise immediately
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
