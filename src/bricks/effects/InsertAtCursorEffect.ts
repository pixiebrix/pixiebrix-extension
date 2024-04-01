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
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { isEmpty } from "lodash";
import selectionController from "@/utils/selectionController";
import type { PlatformCapability } from "@/platform/capabilities";
import {
  ExecCommandError,
  insertAtCursorWithCustomEditorSupport,
} from "@/contentScript/textEditorDom";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { expectContext } from "@/utils/expectContext";
import { BusinessError } from "@/errors/businessErrors";

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
    // Always targets the active field/editor
    return false;
  }

  async effect(
    { text }: BrickArgs<{ text: string }>,
    { logger }: BrickOptions,
  ): Promise<void> {
    expectContext("contentScript");

    if (isEmpty(text)) {
      // Skip because inserting no text is a NOP
      logger.debug("No text provided");
      return;
    }

    // When calling this brick from the sidebar, some editors intentionally clear the selection,
    // so we need to restore it before inserting the text. This isn't necessary on native
    // input fields and contenteditable elements for example.
    // https://github.com/pixiebrix/pixiebrix-extension/pull/7827#issuecomment-1979884573
    selectionController.restoreWithoutClearing();

    try {
      await insertAtCursorWithCustomEditorSupport(text);
    } catch (error) {
      if (error instanceof ExecCommandError) {
        throw new BusinessError(
          "Error inserting text at cursor. Ensure there is a focused editor in the target frame",
          { cause: error },
        );
      }

      throw error;
    }
  }
}

export default InsertAtCursorEffect;
