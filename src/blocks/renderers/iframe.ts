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
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";
import { browser } from "webextension-polyfill-ts";

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
    safeMode,
  }: BlockArg): Promise<string> {
    if (safeMode) {
      return `<iframe src="${url}" title="${title}" height="${height}" width="${width}" style="border:none;" allowfullscreen="false" allowpaymentrequest="false"></iframe>`;
    }

    // https://transitory.technology/browser-extensions-and-csp-headers/
    const frameSrc = browser.runtime.getURL("frame.html");
    const src = `${frameSrc}?url=${encodeURIComponent(url)}`;
    return `<iframe src="${src}" title="${title}" height="${height}" width="${width}" style="border:none;"></iframe>`;
  }
}

registerBlock(new IFrameRenderer());
