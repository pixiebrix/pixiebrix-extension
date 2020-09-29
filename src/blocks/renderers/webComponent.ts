import { Renderer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

export class WebComponentRenderer extends Renderer {
  constructor() {
    super(
      "pixiebrix/contrib-webcomponent-html",
      "Render template HTML with web components, https://www.webcomponents.org/"
    );
  }

  inputSchema = propertiesToSchema({
    components: {
      type: "array",
      description: "Array of web component locations",
      items: {
        type: "string",
      },
    },
    template: {
      type: "string",
      description: "The HTML to render",
    },
  });

  async render({ components = [], template }: BlockArg) {
    for (const component of components) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = component;
      (document.head || document.documentElement).appendChild(script);
    }
    return template;
  }
}

registerBlock(new WebComponentRenderer());
