import { Effect } from "@/types";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class GoogleSearch extends Effect {
  constructor() {
    super(
      "pixiebrix/contrib-google-search",
      "Search Google",
      "Search Google for a query",
      faSearch
    );
  }

  inputSchema: Schema = propertiesToSchema({
    query: {
      type: "string",
      description: "The search query",
    },
  });

  async effect({ query }: BlockArg) {
    // open the search in a new window
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const newWindow = window.open(url, "_blank");
    newWindow.focus();
  }
}

registerBlock(new GoogleSearch());
