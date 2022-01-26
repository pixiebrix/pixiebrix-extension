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

import { Transformer } from "@/types";
import { proxyService } from "@/background/messenger/api";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { PropError } from "@/errors";
import { AxiosRequestConfig } from "axios";

export class RemoteMethod extends Transformer {
  constructor() {
    super(
      "@pixiebrix/http",
      "HTTP Request",
      "Send an RESTful HTTP request, i.e., GET, PUT, POST, PATCH, DELETE"
    );
  }

  defaultOutputKey = "response";

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
        description: "Search/query params",
        additionalProperties: { type: ["string", "number", "boolean"] },
      },
      headers: {
        type: "object",
        description: "Additional request headers",
        additionalProperties: { type: "string" },
      },
      // Match anything, as valid values are determined by the API being called
      data: {},
    },
    ["url"]
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

    const { data } = await proxyService(
      service,
      requestConfig as AxiosRequestConfig
    );
    return data;
  }
}
