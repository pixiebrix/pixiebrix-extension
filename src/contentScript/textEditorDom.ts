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

import * as ckeditorDom from "@/contrib/ckeditor/ckeditorDom";
import * as pageScript from "@/pageScript/messenger/api";
import { getSelectorForElement } from "@/contentScript/elementReference";
import { expectContext } from "@/utils/expectContext";
import { dispatchPasteForDraftJs } from "@/utils/domFieldUtils";
import focusController from "@/utils/focusController";

/**
 * @file Text Editor DOM utilities that might call the pageScript.
 *
 * Historically, we've preferred to use `contentScript` except for calls that must be made from the `pageScript`. The
 * advantage is that 1) we don't have pageScript injection coldstart, and 2) there's less of a chance of the host page
 * interfering with our calls.
 *
 * However, we might consider consolidating the logic in the pageScript to simplify calling conventions.
 */

/**
 * Inserts text at the current cursor position in the given element, with support for custom editors, e.g., CKEditor.
 *
 * Current support:
 * - Plain content editable (Gmail, etc.)
 * - CKEditor 4/5
 *
 */
export async function insertAtCursorWithCustomEditorSupport(text: string) {
  expectContext(
    "contentScript",
    "contentScript context required for editor JavaScript integrations",
  );

  const element = focusController.get();

  const ckeditor = ckeditorDom.selectCKEditorElement(element);
  if (ckeditor) {
    await pageScript.insertCKEditorData({
      selector: getSelectorForElement(ckeditor),
      value: text,
    });

    return;
  }

  if (element.textContent === "" && element.closest(".DraftEditor-root")) {
    // Special handling for DraftJS if the field is empty
    // https://github.com/pixiebrix/pixiebrix-extension/issues/7630
    dispatchPasteForDraftJs(element, text);
    return;
  }

  // Only needed for native input fields
  focusController.restoreWithoutClearing();

  if (!document.execCommand("insertText", false, text)) {
    throw new Error("Failed to insert text using execCommand");
  }
}
