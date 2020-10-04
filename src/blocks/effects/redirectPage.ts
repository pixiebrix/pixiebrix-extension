import { Effect } from "@/types";
import { faWindowMaximize } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";

const URL_INPUT_SPEC: Schema = {
  $schema: "https://json-schema.org/draft/2019-09/schema#",
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "The URL to redirect to",
    },
    params: {
      type: "object",
      description: "URL parameters, will be encoded",
      additionalProperties: { type: "string" },
    },
  },
  required: ["url"],
};

function makeURL(
  url: string,
  params: { [key: string]: string } | undefined
): string {
  const result = new URL(url);
  for (const [name, value] of Object.entries(params ?? {})) {
    result.searchParams.append(name, value);
  }
  return result.toString();
}

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

  async effect({ url, params }: BlockArg) {
    document.location.href = makeURL(url, params);
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

  async effect({ url, params }: BlockArg) {
    const newWindow = window.open(makeURL(url, params), "_blank");
    newWindow.focus();
  }
}

registerBlock(new OpenURLEffect());
registerBlock(new NavigateURLEffect());
