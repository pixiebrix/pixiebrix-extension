/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Transformer } from "@/types";
import { proxyService } from "@/background/requests";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { PropError } from "@/errors";

export class RemoteMethod extends Transformer {
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

  async transform({ service, ...requestConfig }: BlockArg): Promise<unknown> {
    if (service && typeof service !== "object") {
      throw new PropError(
        "Expected configured service",
        this.id,
        "service",
        service
      );
    }
    const { data } = await proxyService(service, requestConfig);
    return data;
  }
}

registerBlock(new RemoteMethod());
