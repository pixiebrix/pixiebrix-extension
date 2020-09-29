import { Effect } from "@/types";
import "notifyjs-browser";
import { proxyService } from "@/messaging/proxy";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";

export class RemoteMethod extends Effect {
  constructor() {
    super("pixiebrix/contrib-api-modify", "HTTP Request");
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
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
    required: ["url", "data", "service"],
  };

  async effect({ service, ...requestConfig }: BlockArg) {
    await proxyService(service, requestConfig);
  }
}

registerBlock(new RemoteMethod());
