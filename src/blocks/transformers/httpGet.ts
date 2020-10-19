import { Transformer } from "@/types";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { proxyService } from "@/background/requests";
import { Schema, BlockArg } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { PropError } from "@/errors";

export class GetAPITransformer extends Transformer {
  constructor() {
    super("@pixiebrix/get", "HTTP GET", "Fetch data from an API", faCloud);
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
          "https://app.pixiebrix.com/schemas/service#/definitions/configuredServiceOrVar",
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

  async transform({ service, ...requestProps }: BlockArg): Promise<unknown> {
    if (service && typeof service !== "object") {
      throw new PropError(
        "Expected configured service",
        this.id,
        "service",
        service
      );
    }
    const { data, status, statusText } = await proxyService(service, {
      ...requestProps,
      method: "get",
    });

    if (status >= 400) {
      throw new Error(`Request error: ${statusText}`);
    }

    return data;
  }
}

registerBlock(new GetAPITransformer());
