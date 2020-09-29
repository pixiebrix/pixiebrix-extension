// @ts-ignore: no type definitions available
import getMetadata from "page-metadata-parser";
import { Reader } from "@/types";
import { Schema } from "@/core";
import { registerBlock } from "@/blocks/registry";

class PageMetadataReader extends Reader {
  constructor() {
    super(
      "pixiebrix/mozilla-page-metadata",
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
