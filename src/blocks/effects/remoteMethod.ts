import { Effect } from "@/types";
import { proxyService } from "@/background/requests";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class RemoteMethod extends Effect {
  constructor() {
    super(
      "@pixiebrix/http",
      "HTTP Request",
      "Send an HTTP request, i.e., GET, PUT, POST, PATCH, DELETE"
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
      method: {
        type: "string",
        default: "post",
        description: "The HTTP method",
        enum: ["post", "put", "patch", "delete", "get"],
      },
      params: {
        type: "object",
        additionalProperties: { type: "string" },
      },
      headers: {
        type: "object",
        description: "Additional request headers",
        additionalProperties: { type: "string" },
      },
      data: {
        type: "object",
        additionalProperties: true,
      },
    },
    ["url", "data"]
  );

  async effect({ service, ...requestConfig }: BlockArg): Promise<void> {
    await proxyService(service, requestConfig);
  }
}

registerBlock(new RemoteMethod());
