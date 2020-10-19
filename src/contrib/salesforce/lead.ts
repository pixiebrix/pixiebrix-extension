import { Effect } from "@/types";
import { BlockArg, Schema } from "@/core";
import { registerBlock } from "@/blocks/registry";
import { proxyService } from "@/background/requests";

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

registerBlock(new AddLead());
