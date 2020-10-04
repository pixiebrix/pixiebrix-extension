import { Transformer } from "@/types";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { proxyService } from "@/messaging/proxy";
import { Schema, BlockOptions, BlockArg } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class GetAPITransformer extends Transformer {
  constructor() {
    super(
      "pipedrive/persons-search",
      "HTTP GET",
      "Fetch data from an API",
      faCloud
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      url: {
        type: "string",
        description: "The API URL",
        format: "uri",
      },
      service: {
        $ref:
          "https://app.pixiebrix.com/schemas/service#/definitions/configuredService",
        description:
          "The service to authenticate the request, if authorization is required",
      },
      params: {
        type: "object",
        description: "The URL parameters",
        additionalProperties: { type: "string" },
      },
      headers: {
        type: "object",
        description: "Additional request headers",
        additionalProperties: { type: "string" },
      },
    },
    ["url"]
  );

  async transform(
    { service, ...requestProps }: BlockArg,
    { ctxt }: BlockOptions
  ): Promise<unknown> {
    return await proxyService(service, { ...requestProps, method: "get" });
  }
}

registerBlock(new GetAPITransformer());
