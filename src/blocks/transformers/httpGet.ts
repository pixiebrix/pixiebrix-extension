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
import { Schema, BlockArg } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { PropError } from "@/errors";
import { isNullOrBlank } from "@/utils";

export class GetAPITransformer extends Transformer {
  constructor() {
    super("@pixiebrix/get", "HTTP GET", "Fetch data from an API", "faCloud");
  }

  defaultOutputKey = "response";

  inputSchema: Schema = propertiesToSchema(
    {
      url: {
        type: "string",
        description: "The API URL",
        // Can't use uri here because we want to support relative URLs when the using a service with a base URL
        format: "string",
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
        additionalProperties: { type: ["string", "number", "boolean"] },
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
    if (!isNullOrBlank(service) && typeof service !== "object") {
      throw new PropError(
        "Expected configured service",
        this.id,
        "service",
        service
      );
    }

    const { data } = await proxyService(
      isNullOrBlank(service) ? null : service,
      {
        ...requestProps,
        method: "get",
      }
    );

    return data;
  }
}
