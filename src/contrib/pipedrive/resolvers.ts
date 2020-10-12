import { Transformer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { proxyService } from "@/background/requests";
import { BlockArg, Schema } from "@/core";

const PIPEDRIVE_SERVICE_ID = "pipedrive/api";

interface SearchResultItem {
  result_score: number;
  item: {
    id: number;
  };
}

interface SearchResult {
  success: boolean;
  data: { items: SearchResultItem[] };
}

export class ResolvePerson extends Transformer {
  constructor() {
    super("pipedrive/persons-search", "Search for a person in Pipedrive");
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      pipedriveService: {
        $ref: `https://app.pixiebrix.com/schemas/services/${PIPEDRIVE_SERVICE_ID}`,
      },
      name: {
        type: "string",
        description: "Person name",
      },
      organization: {
        type: "integer",
        description: "The organization, used to disambiguate the person",
      },
    },
  };

  async transform({
    pipedriveService,
    name,
    organization,
  }: BlockArg): Promise<unknown> {
    let organization_id = undefined;

    if (organization) {
      const {
        data: { data },
      } = await proxyService<SearchResult>(pipedriveService, {
        url: "https://api.pipedrive.com/v1/organizations/search",
        method: "get",
        params: {
          exact_match: true,
          term: name,
        },
      });
      organization_id = data.items.length ? data.items[0].item.id : undefined;
    }

    const {
      data: { data },
    } = await proxyService<SearchResult>(pipedriveService, {
      url: "https://api.pipedrive.com/v1/persons/search",
      method: "get",
      params: {
        exact_match: true,
        term: name,
        organization_id,
      },
    });

    if (!data.items.length) {
      throw new Error(`Could not find person matching ${name}`);
    }

    return data.items[0].item;
  }
}

registerBlock(new ResolvePerson());
