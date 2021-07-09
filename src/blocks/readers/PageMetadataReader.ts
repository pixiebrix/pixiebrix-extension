/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// @ts-ignore: no type definitions available
import { getMetadata } from "page-metadata-parser";
import { Reader } from "@/types";
import { Schema } from "@/core";
import { registerBlock } from "@/blocks/registry";

class PageMetadataReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/document-metadata",
      "Page metadata reader",
      "Read OpenGraph, Twitter, and Meta tags"
    );
  }

  async read() {
    return getMetadata(document, location.href);
  }

  outputSchema: Schema = {
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

registerBlock(new PageMetadataReader());
