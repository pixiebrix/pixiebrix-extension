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

import { ReaderABC } from "../../types/bricks/readerTypes";
import { type Schema } from "../../types/schemaTypes";
import { isLoadedInIframe } from "../../utils/iframeUtils";
import { nowTimestamp } from "../../utils/timeUtils";

class DocumentReader extends ReaderABC {
  override defaultOutputKey = "context";

  constructor() {
    super(
      "@pixiebrix/document-context",
      "Context reader",
      "Read generic metadata about the current page context",
    );
  }

  async read() {
    return {
      url: document.location.href,
      title: document.title,
      timestamp: nowTimestamp(),
      isFrame: isLoadedInIframe(),
    };
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      url: {
        type: "string",
        format: "uri",
        description: "The current URL",
      },
      title: {
        type: "string",
        description: "The current title",
      },
      timestamp: {
        type: "string",
        format: "date-time",
        description: "The current time in ISO format",
      },
      isFrame: {
        type: "boolean",
        description: "Whether the document is in an inline frame",
      },
    },
    required: ["url", "title", "timestamp", "isFrame"],
  };

  async isAvailable() {
    return true;
  }
}

export default DocumentReader;
