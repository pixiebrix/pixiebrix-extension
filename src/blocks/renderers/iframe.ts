/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Renderer } from "@/types";
import { BlockArg, SafeHTML, Schema } from "@/core";
import browser from "webextension-polyfill";
import { assumeSafe } from "@/utils/sanitize";

export class IFrameRenderer extends Renderer {
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
    height = "100%",
    width = "100%",
    safeMode = false,
  }: BlockArg<{
    url: string;
    title?: string;
    height?: string;
    width?: string;
    safeMode?: boolean;
  }>): Promise<SafeHTML> {
    // Parse the URL to ensure it's a real URL (i.e., not an XSS attempt)
    const parsedURL = new URL(url);

    if (safeMode) {
      return assumeSafe(
        `<iframe src="${parsedURL.href}" title="${title}" height="${height}" width="${width}" style="border:none;" allowfullscreen="false" allowpaymentrequest="false"></iframe>`
      );
    }

    // https://transitory.technology/browser-extensions-and-csp-headers/
    const frameURL = browser.runtime.getURL("frame.html");
    const source = `${frameURL}?url=${encodeURIComponent(parsedURL.href)}`;

    return assumeSafe(
      `<iframe src="${source}" title="${title}" height="${height}" width="${width}" style="border:none;"></iframe>`
    );
  }
}
