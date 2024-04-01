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

/** @file CKEditor methods that don't require pageScript access to the CKEditor instance */

/**
 * Returns true if the element appears to be a CKEditor 5 instance based on its class name.
 * Can be called from either the contentScript or web/pageScript context.
 * @see isCKEditorElement
 * @see CKEditor5Instance
 */
export function hasCKEditorClass(element: HTMLElement): boolean {
  return element.classList.contains("ck-editor__editable");
}

/**
 * Returns the CKEditor 5 element that contains the given element, or null if the element is not in a CKEditor instance.
 * Can be called from either the contentScript or web/pageScript context.
 */
export function selectCKEditorElement(
  element: HTMLElement | undefined,
): HTMLElement | null {
  if (!element) {
    return null;
  }

  // Likely faster than repeatedly calling hasCKEditorClass
  return element.closest<HTMLElement>(".ck-editor__editable");
}
