/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { BlockArg, Schema } from "@/core";
import { proxyService } from "@/background/messenger/api";

export class AddLead extends Effect {
  constructor() {
    super(
      "salesforce/leads-create",
      "Create Lead in Salesforce",
      "Create a lead in Salesforce if they do not already exist"
    );
  }

  inputSchema: Schema = {
    // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
    type: "object",
    properties: {
      salesforce: {
        $ref: "https://app.pixiebrix.com/schemas/services/salesforce/oauth2",
      },
      FirstName: {
        type: "string",
        description: "The lead's first name up to 40 characters.",
      },
      LastName: {
        type: "string",
        description: "Required. Last name of the lead up to 80 characters.",
      },
      Company: {
        type: "string",
        description: "Required. The lead’s company.",
      },
      Email: {
        type: "string",
        description: "The lead’s email address.",
      },
      MobilePhone: {
        type: "string",
        description: "The lead’s mobile phone number.",
      },
      Title: {
        type: "string",
        description: "The lead’s description.",
      },
      Description: {
        type: "string",
        description: "The lead’s description.",
      },
    },
    additionalProperties: { type: "string" },
    required: ["salesforce", "LastName", "Company"],
  };

  async effect({ salesforce, ...data }: BlockArg): Promise<void> {
    await proxyService(salesforce, {
      url: "/services/data/v49.0/sobjects/Lead/",
      method: "post",
      data,
    });
  }
}
