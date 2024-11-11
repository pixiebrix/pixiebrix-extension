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
import { type Permissions } from "webextension-polyfill";
import { BusinessError, PropError } from "@/errors/businessErrors";
import { type ContentType, detectContentType } from "@/utils/clipboardUtils";
import { convertDataUrl } from "@/utils/parseDataUrl";
import type { PlatformCapability } from "@/platform/capabilities";

export class CopyToClipboard extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/clipboard/copy",
      "Copy to clipboard",
      "Copy text or images to your clipboard",
    );
  }

  override permissions: Permissions.Permissions = {
    permissions: ["clipboardWrite"],
  };

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["clipboardWrite"];
  }

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
        oneOf: [
          { const: "infer", title: "Infer" },
          { const: "text", title: "Text" },
          { const: "image", title: "Image" },
        ],
      },
      html: {
        title: "HTML",
        description:
          "Optional: HTML content to copy to the clipboard for pasting into rich text editors. Ignored if provided content is not text.",
        type: "string",
      },
    },
  };

  async effect(
    {
      text,
      html,
      // Fallback to "text" for backward compatability
      contentType: contentTypeInput = "text",
    }: BrickArgs<{
      text: string | boolean | number;
      html: string;
      contentType: ContentType;
    }>,
    { logger, platform }: BrickOptions,
  ): Promise<void> {
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
            text,
          );
        }

        try {
          blob = convertDataUrl(text, "Blob");
        } catch (error) {
          throw new BusinessError("Invalid image content", { cause: error });
        }

        if (blob.type !== "image/png") {
          throw new BusinessError(
            "Only PNG images are supported by the browser clipboard API",
          );
        }

        if (html) {
          logger.warn("Ignoring HTML content for image content");
        }

        await platform.clipboard.write({ image: blob });

        break;
      }

      case "text": {
        await platform.clipboard.write({
          text: String(text),
          html,
        });
        break;
      }

      default: {
        const exhaustiveCheck: never = contentType;
        throw new BusinessError(`Invalid content type: ${exhaustiveCheck}`);
      }
    }
  }
}
