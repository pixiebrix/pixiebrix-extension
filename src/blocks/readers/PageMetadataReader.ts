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
import { Schema } from "@/core";

export class PageMetadataReader extends Reader {
  defaultOutputKey = "metadata";

  constructor() {
    super(
      "@pixiebrix/document-metadata",
      "Page metadata reader",
      "Read OpenGraph, Twitter, and Meta tags"
    );
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  async read() {
    const { getMetadata } = await import(
      /* webpackChunkName: "page-metadata-parser" */ "page-metadata-parser"
    );

    // The function getMetadata returns canonical URL of the page, reads it from document
    // This value doesn't change when a navigation event (in SPA) happens
    return {
      ...getMetadata(document, location.href),
      url: String(location.href),
    };
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "A user displayable description for the page.",
      },
      icon: {
        type: "string",
        format: "uri",
        description: "A URL which contains an icon for the page.",
      },
      image: {
        type: "string",
        format: "uri",
        description: "A URL which contains a preview image for the page.",
      },
      keywords: {
        type: "string",
        description: "The meta keywords for the page.",
      },
      title: {
        type: "string",
        description: "A user displayable title for the page.",
      },
      type: {
        type: "string",
        description:
          "The type of content as defined by opengraph (https://ogp.me/#types)",
      },
      url: {
        type: "string",
        format: "uri",
        description: "A canonical URL for the page.",
      },
    },
  };

  async isAvailable() {
    return true;
  }
}
