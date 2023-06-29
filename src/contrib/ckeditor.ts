/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { BusinessError } from "@/errors/businessErrors";
import { expectContext } from "@/utils/expectContext";

/**
 * A CKEditor 5 instance.
 * https://ckeditor.com/docs/ckeditor5/latest/api/index.html
 */
interface CKEditor5Instance {
  /**
   * Sets the data in the editor.
   * https://ckeditor.com/docs/ckeditor5/latest/api/module_core_editor_utils_dataapimixin-DataApi.html#function-setData
   * @param data Input data.
   */
  setData: (data: string) => void;
}

/**
 * Returns true if the element appears to be a CKEditor instance based on its class name.
 */
export function hasCKEditorClass(element: HTMLElement): boolean {
  return element.classList.contains("ck-editor__editable");
}

/**
 * Returns true if the element is a CKEditor instance.
 */
export function isCKEditorElement(
  element: HTMLElement
): element is HTMLElement & { ckeditorInstance: CKEditor5Instance } {
  expectContext("web", "Element properties only available in web context");

  // Verified on version v36.0.0 (CKEditor 5 series)
  return "ckeditorInstance" in element;
}

/**
 * Sets the root value of a CKEEditor instance.
 */
export function setCKEditorData(element: HTMLElement, value: string) {
  expectContext("web", "Element properties only available in web context");

  if (!isCKEditorElement(element)) {
    throw new BusinessError("Element is not a CKEditor instance");
  }

  element.ckeditorInstance.setData(value);
}
