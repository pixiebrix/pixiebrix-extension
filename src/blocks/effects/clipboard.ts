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

import { Effect } from "@/types/blocks/effectTypes";
import { type BlockArgs } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { type Permissions } from "webextension-polyfill";
import { BusinessError, PropError } from "@/errors/businessErrors";
import {
  type ContentType,
  dataURItoBlob,
  detectContentType,
  writeTextToClipboard,
  writeToClipboard,
} from "@/utils/clipboardUtils";

export class CopyToClipboard extends Effect {
  constructor() {
    super(
      "@pixiebrix/clipboard/copy",
      "Copy to clipboard",
      "Copy text or images to your clipboard"
    );
  }

  override permissions: Permissions.Permissions = {
    permissions: ["clipboardWrite"],
  };

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      text: {
        title: "Content",
        description: "The text or image content to copy to the clipboard",
        type: ["string", "boolean", "number"],
      },
      contentType: {
        title: "Content Type",
        type: "string",
        description:
          "The type of content to copy to the clipboard, of 'infer' to detect automatically",
        default: "infer",
        enum: ["infer", "text", "image"],
      },
    },
  };

  async effect({
    text,
    // Fallback to "text" for backward compatability
    contentType: contentTypeInput = "text",
  }: BlockArgs<{
    text: string | boolean | number;
    contentType: ContentType;
  }>): Promise<void> {
    const contentType =
      contentTypeInput === "infer" ? detectContentType(text) : contentTypeInput;

    switch (contentType) {
      case "image": {
        let blob: Blob;

        if (typeof text !== "string") {
          throw new PropError(
            "Invalid image content, expected data URI",
            this.id,
            "text",
            text
          );
        }

        try {
          blob = dataURItoBlob(text);
        } catch (error) {
          throw new BusinessError("Invalid image content", { cause: error });
        }

        if (!("write" in navigator.clipboard)) {
          throw new BusinessError(
            "Your browser does not support writing images to the clipboard"
          );
        }

        await writeToClipboard([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);

        break;
      }

      case "text": {
        await writeTextToClipboard(String(text));
        break;
      }

      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Invalid content type: ${contentType}`);
      }
    }
  }
}
