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
 * DraftJS doesn't handle `insertText` correctly in most cases, but it can handle this
 * event. Note that this event doesn't do anything in regular contentEditable fields.
 * Source: https://github.com/facebookarchive/draft-js/issues/616#issuecomment-426047799
 */
export function dispatchPasteForDraftJs(field: HTMLElement, value: string) {
  const data = new DataTransfer();
  data.setData("text/plain", value);
  field.dispatchEvent(
    new ClipboardEvent("paste", {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
    }),
  );
}

export function isDraftJsField(element: HTMLElement): boolean {
  return Boolean(element.closest(".DraftEditor-root"));
}
