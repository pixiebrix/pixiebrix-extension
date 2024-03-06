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
import { BusinessError } from "@/errors/businessErrors";
import { isEmpty } from "lodash";
import focus from "@/utils/focusController";
import type { PlatformCapability } from "@/platform/capabilities";
import { insertAtCursorWithCustomEditorSupport } from "@/contentScript/textEditorDom";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { expectContext } from "@/utils/expectContext";

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

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    // Requires pageScript to support editors like CKEditor where we need to use their editor API
    return ["dom", "contentScript", "pageScript"];
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    { text }: BrickArgs<{ text: string }>,
    { root, logger }: BrickOptions,
  ): Promise<void> {
    expectContext("contentScript");

    if (isEmpty(text)) {
      // Skip because inserting no text is a NOP
      logger.debug("No text provided");
      return;
    }

    const element = isDocument(root) ? focus.get() : root;

    if (!element) {
      throw new BusinessError("No active element");
    }

    await insertAtCursorWithCustomEditorSupport({
      element,
      text,
    });
  }
}

export default InsertAtCursorEffect;
