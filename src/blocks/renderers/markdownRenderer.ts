import { Renderer } from "@/types";
import marked from "marked";
import createDOMPurify from "dompurify";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

const DOMPurify = createDOMPurify(window);

export class MarkdownRenderer extends Renderer {
  constructor() {
    super(
      "pixiebrix/contrib-markdown-renderer",
      "Markdown Renderer",
      "Render Markdown"
    );
  }

  inputSchema = propertiesToSchema({
    markdown: {
      type: "string",
      description: "The Markdown to render",
    },
  });

  async render({ markdown }: BlockArg) {
    return DOMPurify.sanitize(marked(markdown));
  }
}

registerBlock(new MarkdownRenderer());
