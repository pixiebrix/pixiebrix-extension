import { Renderer } from "@/types";
import makeDataTable from "@/blocks/renderers/dataTable";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { proxyService } from "@/messaging/proxy";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

export class GoogleScholarSearchTable extends Renderer {
  constructor() {
    super(
      "serpapi.google.scholar.search",
      "Google Scholar Search for a Query",
      "A table of Google Scholar Search Results",
      faLightbulb
    );
  }

  inputSchema = propertiesToSchema({
    service: {
      $ref: "https://app.pixiebrix.com/schemas/services/serpapi",
    },
    query: {
      type: "string",
      description: "The search query",
    },
  });

  async render({ service, query }: BlockArg) {
    const data = await proxyService(service, {
      url: "https://serpapi.com/search",
      params: {
        engine: "google_scholar",
        q: query,
      },
      method: "GET",
    });

    // @ts-ignore: come back and write google result interface
    const articles = (data.organic_results ?? []).map((x) => ({
      title: x.title,
      url: x.link,
      citationCount: x.inline_links.cited_by?.total,
      publicationInfo: x.publication_info?.summary,
    }));

    const table = makeDataTable([
      {
        label: "Title",
        property: "title",
        renderer: (value, row: any) =>
          `<a href="${row.url}" target="_blank" rel="noopener noreferrer">${value}</a>`,
      },
      { label: "# Citations", property: "citationCount" },
      { label: "Publication", property: "publicationInfo" },
    ]);

    return table(articles);
  }
}

registerBlock(new GoogleScholarSearchTable());
