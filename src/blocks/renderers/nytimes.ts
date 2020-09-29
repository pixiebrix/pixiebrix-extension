import { Renderer } from "@/types";
import makeDataTable from "@/blocks/renderers/dataTable";
import { faNewspaper } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { proxyService } from "@/messaging/proxy";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";

export class NYTimesCompanyNewsTable extends Renderer {
  constructor() {
    super(
      "com.nytimes.organization.news",
      "NYTimes news for an organization",
      "A table of the latest NYTimes news for an organization",
      faNewspaper
    );
  }

  inputSchema = propertiesToSchema({
    nytimes: {
      $ref: "https://app.pixiebrix.com/schemas/services/nytimes",
    },
    organization: {
      type: "string",
      description: "The organization to search",
    },
  });

  async render({ nytimes, organization }: BlockArg) {
    const data = await proxyService(nytimes, {
      url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
      params: {
        fq: `organizations.contains:("${organization}")`,
        fl: `web_url,source,headline`,
      },
      method: "GET",
    });

    // @ts-ignore: come back and write the response type for nytimes
    const articles = data.response.docs.map((x) => ({
      url: x.web_url,
      title: x.headline.main,
      source: x.source,
    }));

    const table = makeDataTable([
      { label: "Source", property: "source" },
      {
        label: "Title",
        property: "title",
        renderer: (value, row: any) =>
          `<a href="${row.url}" target="_blank" rel="noopener noreferrer">${value}</a>`,
      },
    ]);

    return table(articles);
  }
}

registerBlock(new NYTimesCompanyNewsTable());
