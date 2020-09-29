import { Renderer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";

export class IFrameRenderer extends Renderer {
  constructor() {
    super("pixiebrix/contrib-iframe", "IFrame", "Show a website in an iframe");
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
      },
      height: {
        type: "string",
        description: "The height of the IFrame",
      },
      safeMode: {
        type: "boolean",
        description: "Run with the parent CSP",
      },
    },
    required: ["url"],
  };

  async render({
    url,
    title = "PixieBrix",
    height = 400,
    width = "100%",
    safeMode,
  }: BlockArg) {
    if (safeMode) {
      return `<iframe src="${url}" title="${title}" height="${height}" width="${width}" style="border:none;" allowfullscreen="false" allowpaymentrequest="false"></iframe>`;
    } else {
      // https://transitory.technology/browser-extensions-and-csp-headers/
      const frameSrc = chrome.extension.getURL("frame.html");
      const src = `${frameSrc}?url=${encodeURIComponent(url)}`;
      return `<iframe src="${src}" title="${title}" height="${height}" width="${width}" style="border:none;"></iframe>`;
    }
  }
}

registerBlock(new IFrameRenderer());
