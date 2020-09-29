import { Renderer } from "@/types";
import makeDataTable from "@/blocks/renderers/dataTable";
import { faNewspaper } from "@fortawesome/free-solid-svg-icons";
import { safeRequest } from "@/chrome";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

interface Hit {
  title: string;
  author: string;
  url: string;
}

export class HackerNewsTable extends Renderer {
  constructor() {
    super(
      "com.ycombinator.news",
      "Hacker News Article Table",
      "A table of the latest HN articles for a search",
      faNewspaper
    );
  }

  inputSchema = propertiesToSchema({
    query: {
      type: "string",
      description: "The query to search on Hacker News",
    },
  });

  async render({ query }: BlockArg) {
    const data: { hits: Hit[] } = (await safeRequest({
      url: "https://hn.algolia.com/api/v1/search",
      method: "get",
      params: { query },
    })) as any;

    const { hits } = data;

    const table = makeDataTable([
      { label: "Author", property: "author" },
      {
        label: "Title",
        property: "title",
        renderer: (value, row: any) =>
          `<a href="${row.url}" target="_blank" rel="noopener noreferrer">${value}</a>`,
      },
    ]);

    return table(hits.filter((x) => !!x.title));
  }
}

registerBlock(new HackerNewsTable());
