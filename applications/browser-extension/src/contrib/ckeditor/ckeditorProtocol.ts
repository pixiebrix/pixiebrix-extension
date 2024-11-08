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

/** @file CKEditor methods that call JS methods on the CKEditor instance */

import { forbidContext } from "../../utils/expectContext";
import { BusinessError } from "../../errors/businessErrors";

/**
 * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_position-Position.html
 */
// Treat position as an opaque type. We don't care about the implementation details for now
type Position = {
  _positionBrand: never;
};

/**
 * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_range-Range.html
 */
type Range = {
  start: Position;
  end: Position;
};

/**
 * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_writer-Writer.html
 */
type CKEditor5Writer = {
  /**
   * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_writer-Writer.html#function-insertText:WITHOUT_ATTRIBUTES
   */
  insertText: (item: string, position: Position) => void;

  /**
   * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_writer-Writer.html#function-remove
   */
  remove: (range: Range) => void;
};

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

  /**
   * The model of the editor.
   * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_model-Model.html
   */
  model: {
    change: (callback: (writer: CKEditor5Writer) => void) => void;
    document: {
      selection: {
        /**
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_documentselection-DocumentSelection.html#function-getFirstPosition
         */
        getFirstPosition: () => Position | null;
        /**
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_documentselection-DocumentSelection.html#function-getLastPosition
         */
        getLastPosition: () => Position | null;
        /**
         * https://ckeditor.com/docs/ckeditor5/latest/api/module_engine_model_documentselection-DocumentSelection.html#function-getFirstRange
         */
        getFirstRange: () => Range | null;
      };
    };
  };
}

/**
 * Returns true if the element is a CKEditor instance. Can only be called from the web/pageScript context.
 * @see hasCKEditorClass
 * @internal
 */
export function isCKEditorElement(
  element: HTMLElement,
): element is HTMLElement & { ckeditorInstance: CKEditor5Instance } {
  forbidContext(
    "extension",
    "Element properties only available outside the isolated word",
  );

  // Verified on version v36.0.0 (CKEditor 5 series)
  return "ckeditorInstance" in element;
}

/**
 * Sets the root value of a CKEditor instance.
 */
export function setData(element: HTMLElement, value: string): void {
  forbidContext(
    "extension",
    "Element properties only available outside the isolated word",
  );

  if (!isCKEditorElement(element)) {
    throw new BusinessError(
      "Element is not a CKEditor instance, or PixieBrix does not support setting the value for this version of CKEditor",
    );
  }

  element.ckeditorInstance.setData(value);
}

export function insertText(element: HTMLElement, value: string): void {
  forbidContext(
    "extension",
    "Element properties only available outside the isolated word",
  );

  if (!isCKEditorElement(element)) {
    throw new BusinessError(
      "Element is not a CKEditor instance, or PixieBrix does not support setting the value for this version of CKEditor",
    );
  }

  const editor = element.ckeditorInstance;

  editor.model.change((writer) => {
    const firstPosition = editor.model.document.selection.getFirstPosition();
    if (firstPosition == null) {
      return;
    }

    // Clear any selected text
    if (firstPosition !== editor.model.document.selection.getLastPosition()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Must exist if the selection is not empty
      writer.remove(editor.model.document.selection.getFirstRange()!);
    }

    writer.insertText(value, firstPosition);
  });
}
