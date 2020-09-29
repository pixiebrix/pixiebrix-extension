import { Renderer } from "@/types";
import createDOMPurify from "dompurify";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

const DOMPurify = createDOMPurify(window);

export class HtmlRenderer extends Renderer {
  constructor() {
    super(
      "pixiebrix/contrib-html",
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
    return DOMPurify.sanitize(html);
  }
}

registerBlock(new HtmlRenderer());
