import { Effect } from "@/types";
import { proxyService } from "@/messaging/proxy";
import { registerBlock } from "@/blocks/registry";
import { Schema, BlockArg } from "@/core";
import partial from "lodash/partial";

function makeProperties(obj: object, propertyKey: string = "property") {
  return Object.entries(obj)
    .filter(([, value]) => !!value)
    .map(([property, value]) => ({
      [propertyKey]: property,
      value,
    }));
}

export class AddUpdateContact extends Effect {
  constructor() {
    super(
      "hubspot/create-update-contact",
      "Create/Update a HubSpot contact",
      "Create/Update a HubSpot contact email and/or other information available"
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      service: {
        $ref: "https://app.pixiebrix.com/schemas/services/hubspot/api",
      },
      email: {
        type: "string",
        format: "email",
      },
      firstname: {
        type: "string",
      },
      lastname: {
        type: "string",
      },
      company: {
        type: "string",
      },
      city: {
        type: "string",
      },
      country: {
        type: "string",
      },
      state: {
        type: "string",
      },
      address: {
        type: "string",
      },
      phone: {
        type: "string",
      },
      job_title: {
        type: "string",
      },
      website: {
        type: "string",
        format: "uri",
      },
      hubspot_owner_id: {
        type: "integer",
      },
    },
    additionalProperties: { type: "string" },
  };

  async effect(config: BlockArg) {
    const {
      service,
      email,
      firstname,
      lastname,
      company,
      ...otherValues
    } = config;

    const proxyHubspot = partial(proxyService, service);

    const properties = makeProperties({
      ...otherValues,
      firstname,
      lastname,
      company,
    });

    if (email) {
      await proxyHubspot({
        url: `https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${email}/`,
        method: "post",
        data: { properties },
      });
    } else {
      if (!firstname || !lastname) {
        throw new Error(
          "firstname and lastname are required if an email is not provided"
        );
      }
      // @ts-ignore: come back and define types for the hubspot API
      const { contacts } = await proxyHubspot({
        url: "https://api.hubapi.com/contacts/v1/search/query",
        params: { q: `${firstname} ${lastname} ${company}`.trim(), count: 5 },
        method: "get",
      });
      if (contacts.length === 1) {
        await proxyHubspot({
          url: `https://api.hubapi.com/contacts/v1/contact/vid/${contacts[0].vid}/profile`,
          method: "post",
          data: { properties },
        });
      } else if (contacts.length > 1) {
        throw new Error("Multiple Hubspot connections found");
      } else {
        await proxyHubspot({
          url: `https://api.hubapi.com/contacts/v1/contact/`,
          method: "post",
          data: { properties },
        });
      }
    }
  }
}

export class AddUpdateCompany extends Effect {
  constructor() {
    super(
      "hubspot/create-update-company",
      "Create/Update a HubSpot company",
      "Create/Update a HubSpot company by website domain"
    );
  }

  inputSchema: Schema = {
    // https://knowledge.hubspot.com/companies/hubspot-crm-default-company-properties
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      hubspot: {
        $ref: "https://app.pixiebrix.com/schemas/services/hubspot/api",
      },
      name: {
        type: "string",
        description: "A company name",
      },
      description: {
        type: "string",
        description: "A company description",
      },
      website: {
        type: "string",
        description: "The company website URL",
        format: "uri",
      },
      hubspot_owner_id: {
        type: "integer",
      },
    },
    required: ["website"],
  };

  async effect(config: BlockArg) {
    const { hubspot, website } = config;

    const proxyHubspot = partial(proxyService, hubspot);

    if (!website) {
      console.error("Website is required", config);
      throw new Error("Website is required");
    }

    const properties = makeProperties(config, "name");

    const hostName = new URL(website).hostname;

    // @ts-ignore: come back and define types for the hubspot API
    const { results } = await proxyHubspot({
      url: `https://api.hubapi.com/companies/v2/domains/${hostName}/companies`,
      method: "post",
      data: {
        limit: 2,
        requestOptions: {
          properties: ["domain", "name"],
        },
      },
    });

    if (results.length === 1) {
      await proxyHubspot({
        url: `https://api.hubapi.com/companies/v2/companies/${results[0].companyId}`,
        method: "put",
        data: { properties },
      });
    } else if (results.length > 1) {
      throw new Error("Multiple Hubspot companies found");
    } else {
      await proxyHubspot({
        url: "https://api.hubapi.com/companies/v2/companies",
        method: "post",
        data: { properties },
      });
    }
  }
}

registerBlock(new AddUpdateContact());
registerBlock(new AddUpdateCompany());
