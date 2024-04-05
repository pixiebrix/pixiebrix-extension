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
 * @file This file contains utility functions for interacting with Draft.js editors.
 * - See {@link https://draftjs.org/} for more information.
 * - See example for regression testing at {@link https://pbx.vercel.app/advanced-fields/}
 */

/**
 * Insert text into a Draft.js field at the cursor.
 */
export function insertIntoDraftJs(field: HTMLElement, value: string): void {
  // Using execCommand with `insertText` causes data corruption. See:
  // - https://github.com/pixiebrix/pixiebrix-extension/issues/7630
  // - https://github.com/pixiebrix/pixiebrix-extension/issues/8157
  // Draft.js can handle the Clipboard `paste` event. Which doesn't work in general contentEditable fields.
  // Source: https://github.com/facebookarchive/draft-js/issues/616#issuecomment-426047799
  const data = new DataTransfer();
  data.setData("text/plain", value);
  // Note that this event doesn't do anything in regular contentEditable fields.
  field.dispatchEvent(
    new ClipboardEvent("paste", {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
    }),
  );
}

/**
 * Set the current value of a Draft.js field.
 */
export function setDraftJs(field: HTMLElement, value: string): void {
  // FIXME: selectAll doesn't seem to do anything on our demo site. Might have to mess with the Draft.js API in the
  //   page script.
  // https://github.com/facebookarchive/draft-js/issues/1386#issuecomment-341420754
  field.focus();
  field.click();
  document.execCommand("selectAll", false);

  // At first, document.execCommand "insertText" appears to work. However, backspace, etc. won't work because the field
  // is corrupted.
  insertIntoDraftJs(field, value);
}

/**
 * Return true if the element is or is contained inside a DraftJS field.
 */
export function isDraftJsField(element: HTMLElement): boolean {
  return Boolean(element.closest(".DraftEditor-root"));
}
