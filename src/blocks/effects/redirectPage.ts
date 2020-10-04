import { Effect } from "@/types";
import { faWindowMaximize } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

const URL_INPUT_SPEC = propertiesToSchema({
  url: {
    type: "string",
    description: "The URL to redirect to",
  },
});

export class NavigateURLEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/location",
      "Redirect Page",
      "Navigate the current page to a URL",
      faWindowMaximize
    );
  }

  inputSchema = URL_INPUT_SPEC;

  async effect({ url }: BlockArg) {
    document.location.href = url;
  }
}

export class OpenURLEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/open-tab",
      "Open a Tab/Window",
      "Open a URL in a new tab/window",
      faWindowMaximize
    );
  }

  inputSchema = URL_INPUT_SPEC;

  async effect({ url }: BlockArg) {
    const newWindow = window.open(url, "_blank");
    newWindow.focus();
  }
}

registerBlock(new OpenURLEffect());
registerBlock(new NavigateURLEffect());
