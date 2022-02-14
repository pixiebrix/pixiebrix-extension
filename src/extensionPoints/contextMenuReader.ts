/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { Reader } from "@/types";
import { ReaderOutput, Schema } from "@/core";

/**
 * A reader "stub" for the context menu reader.
 *
 * The data for the output scheme is filled by the extension point via the browser API.
 */
export class ContextMenuReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/context-menu-data",
      "Context menu reader",
      "Data from a context menu event"
    );
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async read(): Promise<ReaderOutput> {
    // The actual field is set by the extension point, not the reader, because it's made available
    // by the browser API in the menu handler
    throw new Error("ContextMenuReader.read() should not be called directly");
  }

  override outputSchema: Schema = {
    type: "object",
    properties: {
      mediaType: {
        type: "string",
        description:
          "One of 'image', 'video', or 'audio' if the context menu was activated on one of these types of elements.",
        enum: ["image", "video", "audio"],
      },
      linkText: {
        type: "string",
        description: "If the element is a link, the text of that link.",
      },
      linkUrl: {
        type: "string",
        description: "If the element is a link, the URL it points to.",
        format: "uri",
      },
      srcUrl: {
        type: "string",
        description: "Will be present for elements with a 'src' URL.",
        format: "uri",
      },
      selectionText: {
        type: "string",
        description: "The text for the context selection, if any.",
      },
      documentUrl: {
        type: "string",
        description: "The URL of the page where the context menu was activated",
        format: "uri",
      },
    },
  };
}
