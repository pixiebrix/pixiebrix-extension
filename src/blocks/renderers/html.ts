import { Renderer } from "@/types";
import createDOMPurify, { DOMPurifyI } from "dompurify";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

export class Html extends Renderer {
  private DOMPurify: DOMPurifyI;

  constructor() {
    super(
      "@pixiebrix/html",
      "HTML Renderer",
      "Render HTML, sanitizing it first"
    );
  }

  inputSchema = propertiesToSchema({
    html: {
      type: "string",
      description: "The HTML string to render",
    },
  });

  async render({ html }: BlockArg) {
    if (!this.DOMPurify) {
      this.DOMPurify = createDOMPurify(window);
    }
    return this.DOMPurify.sanitize(html);
  }
}

registerBlock(new Html());
