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

import { RendererABC } from "@/types/bricks/rendererTypes";
import { assumeSafe } from "@/utils/sanitize";
import { type Schema } from "@/types/schemaTypes";
import { type BrickArgs } from "@/types/runtimeTypes";
import { type SafeHTML } from "@/types/stringTypes";

export class IFrameRenderer extends RendererABC {
  constructor() {
    super("@pixiebrix/iframe", "IFrame", "Show a website in an iframe");
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to display in the IFrame",
      },
      title: {
        type: "string",
        description: "The title of the IFrame",
      },
      // The name field for the iframe. Added in 1.8.5 because the AA copilot frame requires it for messaging.
      // @since 1.8.5
      name: {
        type: "string",
        description: "The name of the IFrame",
      },
      width: {
        type: "string",
        description: "The width of the IFrame",
        default: "100%",
      },
      height: {
        type: "string",
        description: "The height of the IFrame",
        default: "100%",
      },
      safeMode: {
        type: "boolean",
        description: "Run with the parent Content Security Policy (CSP)",
        default: false,
      },
    },
    required: ["url"],
  };

  async render({
    url,
    title = "PixieBrix",
    name = "",
    height = "100%",
    width = "100%",
    safeMode = false,
  }: BrickArgs<{
    url: string;
    title?: string;
    name?: string;
    height?: string;
    width?: string;
    safeMode?: boolean;
  }>): Promise<SafeHTML> {
    // Parse the URL to ensure it's a real URL (i.e., not an XSS attempt)
    const parsedURL = new URL(url);

    if (safeMode) {
      const namePart = name ? ` name="${name}"` : "";

      return assumeSafe(
        `<iframe src="${parsedURL.href}" title="${title}" ${namePart} height="${height}" width="${width}" style="border:none;" allowfullscreen="false" allowpaymentrequest="false"></iframe>`,
      );
    }

    // https://transitory.technology/browser-extensions-and-csp-headers/
    const frameURL = browser.runtime.getURL("frame.html");
    const namePart = name ? `&name=${encodeURIComponent(name)}` : "";
    const source = `${frameURL}?url=${encodeURIComponent(
      parsedURL.href,
    )}${namePart}`;

    return assumeSafe(
      `<iframe src="${source}" title="${title}" height="${height}" width="${width}" style="border:none;"></iframe>`,
    );
  }
}
