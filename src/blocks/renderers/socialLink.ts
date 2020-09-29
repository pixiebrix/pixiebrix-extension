import { Renderer } from "@/types";
import Mustache from "mustache";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

export class SocialLinkComponent extends Renderer {
  constructor() {
    super(
      "pixiebrix/examples-webcomponent-sociallink",
      "Social Link component"
    );
  }

  inputSchema = propertiesToSchema({
    network: {
      type: "string",
      description: "The network, e.g., Github",
    },
    handle: {
      type: "string",
      description: "The username/handle on the network",
    },
  });

  components = [
    "https://cdn.jsdelivr.net/gh/vanillawc/wc-social-link/index.js",
  ];

  template =
    '<wc-social-link network="{{network}}" handle="{{handle}}"></wc-social-link>';

  async render({ network, handle }: BlockArg) {
    const script = document.createElement("script");
    script.type = "module";
    script.src = this.components[0];
    (document.head || document.documentElement).appendChild(script);
    return Mustache.render(this.template, { network, handle });
  }
}

registerBlock(new SocialLinkComponent());
