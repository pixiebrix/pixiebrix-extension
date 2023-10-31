/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { performConfiguredRequestInBackground } from "@/background/messenger/api";
import { type BrickArgs } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import { type AxiosRequestConfig } from "axios";
import { PropError } from "@/errors/businessErrors";
import { validateRegistryId } from "@/types/helpers";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";

export const inputProperties: Record<string, Schema> = {
  url: {
    title: "URL",
    type: "string",
    description: "The API endpoint URL",
  },
  service: {
    title: "Integration Configuration",
    $ref: "https://app.pixiebrix.com/schemas/service#/definitions/configuredService",
    description:
      "Optional. The integration configuration to authenticate the request, if authorization is required",
  },
  method: {
    title: "Method",
    type: "string",
    default: "post",
    description: "The HTTP method",
    enum: ["post", "put", "patch", "delete", "get"],
  },
  params: {
    title: "Search Parameters",
    type: "object",
    description: "Search/query params",
    additionalProperties: { type: ["string", "number", "boolean"] },
  },
  headers: {
    title: "Headers",
    type: "object",
    description: "Additional request headers",
    additionalProperties: { type: "string" },
  },
  // Match anything, as valid values are determined by the API being called
  data: {
    title: "JSON Data",
    description:
      "Supports a JSON payload provided by either a variable or an object",
  },
};

export class RemoteMethod extends TransformerABC {
  static BLOCK_ID = validateRegistryId("@pixiebrix/http");

  constructor() {
    super(
      RemoteMethod.BLOCK_ID,
      "HTTP Request",
      "Send an RESTful HTTP request, i.e., GET, PUT, POST, PATCH, DELETE"
    );
  }

  defaultOutputKey = "response";

  inputSchema: Schema = propertiesToSchema(inputProperties, ["url"]);

  async transform({
    service,
    ...requestConfig
  }: BrickArgs<{
    service: SanitizedIntegrationConfig;
    requestConfig: AxiosRequestConfig;
    _blockArgBrand: never;
  }>): Promise<unknown> {
    if (service && typeof service !== "object") {
      throw new PropError(
        "Expected configured service",
        this.id,
        "service",
        service
      );
    }

    const { data } = await performConfiguredRequestInBackground(
      service,
      requestConfig as AxiosRequestConfig
    );
    return data;
  }
}
