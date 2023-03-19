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

import { Effect } from "@/types";
import copy from "copy-text-to-clipboard";
import { type BlockArg, type Schema } from "@/core";
import { type Permissions } from "webextension-polyfill";
import { BusinessError, PropError } from "@/errors/businessErrors";
import { getErrorMessage } from "@/errors/errorHelpers";

type ContentType = "infer" | "text" | "image";

function detectContentType(content: unknown): "text" | "image" {
  if (typeof content === "string" && content.startsWith("data:image/")) {
    return "image";
  }

  return "text";
}

// Parse instead of using fetch to avoid potential CSP issues with data: URIs
// https://stackoverflow.com/a/12300351
function dataURItoBlob(dataURI: string): Blob {
  // Convert base64 to raw binary data held in a string doesn't handle URLEncoded DataURIs - see SO answer #6850276 for
  // code that does this
  const byteString = atob(dataURI.split(",")[1]);

  // Separate out the mime component
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // Write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);

  // Create a view into the buffer
  const ia = new Uint8Array(ab);

  // Set the bytes of the buffer to the correct values
  for (let i = 0; i < byteString.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point,security/detect-object-injection -- is a number; copied SO
    ia[i] = byteString.charCodeAt(i);
  }

  // Write the ArrayBuffer to a blob, and you're done
  return new Blob([ab], { type: mimeString });
}

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
  }: BlockArg<{
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

        const data = [
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ];

        try {
          await navigator.clipboard.write(data);
        } catch (error) {
          if (
            getErrorMessage(error)
              .toLowerCase()
              .includes("document is not focused")
          ) {
            // This occurs if there are other users interaction (e.g., Modal Form, Window Alert, etc.) between
            // the content generation and the clipboard write.
            // I tried working around this by adding a click handler to the document body, and retrying when the
            // user clicked the page, but that didn't work.
            throw new BusinessError(
              "Copying an image must occur before any user interaction."
            );
          }

          throw error;
        }

        break;
      }

      case "text": {
        copy(String(text));
        break;
      }

      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Invalid content type: ${contentType}`);
      }
    }
  }
}
