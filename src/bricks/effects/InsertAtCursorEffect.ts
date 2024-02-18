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

import { EffectABC } from "@/types/bricks/effectTypes";
import {
  type BrickArgs,
  type BrickOptions,
  isDocument,
} from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import textFieldEdit from "text-field-edit";
import { BusinessError } from "@/errors/businessErrors";
import { isEmpty } from "lodash";

/**
 * Insert text at the cursor position. For use with text snippets, etc.
 * @see selectionController for limitations when using the quickbar
 */
class InsertAtCursorEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/html/insert-text",
      "[Experimental] Insert Text at Cursor",
      "Insert text at the cursor position the active field/editor",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      text: {
        type: "string",
      },
    },
    ["text"],
  );

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    { text }: BrickArgs<{ text: string }>,
    { root }: BrickOptions,
  ): Promise<void> {
    if (isEmpty(text)) {
      return;
    }

    const element: HTMLElement = isDocument(root)
      ? (document.activeElement as HTMLElement)
      : root;

    if (!element) {
      throw new BusinessError("No active element");
    }

    // Demo page: https://pbx.vercel.app/bootstrap-5/
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      const textElement = element as HTMLTextAreaElement | HTMLInputElement;
      textFieldEdit.insert(textElement, text);
      return;
    }

    // Editors to check
    // - ✅ Vanilla content editable: https://pbx.vercel.app/react-admin/#/products/1/description
    // - ✅ DraftJS: https://draftjs.org/
    // - ✅ TinyMCE: https://www.tiny.cloud/docs/demo/basic-example/ - when using Run All Frames
    // - ❌ CKEditor: https://ckeditor.com/ckeditor-5/demo/feature-rich/
    if (element.contentEditable) {
      element.focus();
      // This approach seems to be more reliable than range.insertNode(document.createTextNode(text));
      document.execCommand("insertText", false, text);
      return;
    }

    throw new BusinessError(
      "Target element is not an input, textarea, or contenteditable element.",
    );
  }
}

export default InsertAtCursorEffect;
