import { Renderer } from "@/types";
import marked from "marked";
import createDOMPurify, { DOMPurifyI } from "dompurify";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

export class Markdown extends Renderer {
  private DOMPurify: DOMPurifyI;

  constructor() {
    super(
      "@pixiebrix/markdown",
      "Render Markdown",
      "Render Markdown to sanitized HTML"
    );
  }

  inputSchema = propertiesToSchema({
    markdown: {
      type: "string",
      description: "The Markdown to render",
    },
  });

  async render({ markdown }: BlockArg) {
    if (!this.DOMPurify) {
      this.DOMPurify = createDOMPurify(window);
    }
    return this.DOMPurify.sanitize(marked(markdown));
  }
}

registerBlock(new Markdown());
