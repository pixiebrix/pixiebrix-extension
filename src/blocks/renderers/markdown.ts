import { Renderer } from "@/types";
import marked from "marked";
import createDOMPurify from "dompurify";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

const DOMPurify = createDOMPurify(window);

export class Markdown extends Renderer {
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
    return DOMPurify.sanitize(marked(markdown));
  }
}

registerBlock(new Markdown());
