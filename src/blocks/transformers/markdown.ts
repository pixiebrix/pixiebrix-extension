import { Transformer } from "@/types";
import marked from "marked";
import createDOMPurify from "dompurify";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

const DOMPurify = createDOMPurify(window);

export class MarkdownTransformer extends Transformer {
  constructor() {
    super(
      "pixiebrix/contrib-markdown-transform",
      "Markdown Transformer",
      "Convert markdown to sanitized HTML"
    );
  }

  inputSchema = propertiesToSchema({
    markdown: {
      type: "string",
      description: "The Markdown to render",
    },
  });

  async transform({ markdown }: BlockArg) {
    return DOMPurify.sanitize(marked(markdown));
  }
}

registerBlock(new MarkdownTransformer());
