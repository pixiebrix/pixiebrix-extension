/*
 * Copyright (C) 2022 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Effect } from "@/types";
import { proxyService } from "@/background/messenger/api";
import { Schema, BlockArg } from "@/core";
import { partial } from "lodash";
import { BusinessError } from "@/errors/businessErrors";

function makeProperties(
  obj: Record<string, unknown>,
  propertyKey = "property"
) {
  return Object.entries(obj)
    .filter(([, value]) => Boolean(value))
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

  async effect({
    service,
    email,
    firstname,
    lastname,
    company,
    ...otherValues
  }: BlockArg): Promise<void> {
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
        throw new BusinessError(
          "firstname and lastname are required if an email is not provided"
        );
      }

      // @ts-expect-error come back and define types for the hubspot API
      const { contacts } = await proxyHubspot({
        url: "https://api.hubapi.com/contacts/v1/search/query",
        params: { q: `${firstname} ${lastname} ${company}`.trim(), count: 5 },
        method: "get",
      });
      if (contacts.length > 1) {
        throw new BusinessError("Multiple Hubspot contacts found");
      }

      if (contacts.length === 1) {
        await proxyHubspot({
          url: `https://api.hubapi.com/contacts/v1/contact/vid/${contacts[0].vid}/profile`,
          method: "post",
          data: { properties },
        });
      } else {
        await proxyHubspot({
          url: "https://api.hubapi.com/contacts/v1/contact/",
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

  async effect(config: BlockArg): Promise<void> {
    const { hubspot, website } = config;

    const proxyHubspot = partial(proxyService, hubspot);

    if (!website) {
      console.error("Website is required", config);
      throw new BusinessError("Website is required");
    }

    const properties = makeProperties(config, "name");

    const hostName = new URL(website).hostname;

    // @ts-expect-error come back and define types for the hubspot API
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
    if (results.length > 1) {
      throw new BusinessError("Multiple Hubspot companies found");
    }

    if (results.length === 1) {
      await proxyHubspot({
        url: `https://api.hubapi.com/companies/v2/companies/${results[0].companyId}`,
        method: "put",
        data: { properties },
      });
    } else {
      await proxyHubspot({
        url: "https://api.hubapi.com/companies/v2/companies",
        method: "post",
        data: { properties },
      });
    }
  }
}
