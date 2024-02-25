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

import { selectCKEditorElement } from "@/contrib/ckeditor";
import { insertCKEditorData } from "@/pageScript/messenger/api";
import { getSelectorForElement } from "@/contentScript/elementReference";
import textFieldEdit from "text-field-edit";
import { expectContext } from "@/utils/expectContext";
import { isSelectableTextControlElement } from "@/types/inputTypes";

/**
 * @file file for contentScript-specific text editor DOM utilities.
 */

/**
 * Inserts text at the current cursor position in the given element, with support for custom editors, e.g., CKEditor.
 *
 * Status for reference editors to check:
 * - ✅ Vanilla content editable: https://pbx.vercel.app/react-admin/#/products/1/description
 * - ❌ CKEditor 5: https://ckeditor.com/ckeditor-5/demo/feature-rich/
 * - ⚠️ DraftJS: https://draftjs.org/
 * - ⚠️ TinyMCE: https://www.tiny.cloud/docs/demo/basic-example/
 *
 * @param element the element to insert text into. Can be a text input, textarea, or contenteditable element.
 * @param text the text to insert
 */
export async function insertAtCursorWithCustomEditorSupport({
  element,
  text,
}: {
  element: HTMLElement;
  text: string;
}) {
  expectContext(
    "contentScript",
    "contentScript context required for editor JavaScript integrations",
  );

  if (isSelectableTextControlElement(element)) {
    textFieldEdit.insert(element, text);
    return;
  }

  const ckeditor = selectCKEditorElement(element);

  if (ckeditor) {
    await insertCKEditorData({
      selector: getSelectorForElement(ckeditor),
      value: text,
    });

    return;
  }

  // Ensure window is focused so, so that when calling from the sidebar, the browser will show the cursor and
  // the user can keep typing
  window.focus();

  // Ensure the element has focus, so that text is inserted at the cursor position
  if (document.activeElement !== element) {
    element.focus();
  }

  textFieldEdit.insert(element, text);
}
