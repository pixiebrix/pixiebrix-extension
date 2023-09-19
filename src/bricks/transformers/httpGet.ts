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
import { propertiesToSchema } from "@/validators/generic";
import { PropError } from "@/errors/businessErrors";
import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import { type BrickArgs } from "@/types/runtimeTypes";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import { type AxiosRequestConfig } from "axios";
import { isNullOrBlank } from "@/utils/stringUtils";

export class GetAPITransformer extends TransformerABC {
  static BLOCK_ID = validateRegistryId("@pixiebrix/get");

  constructor() {
    super(
      GetAPITransformer.BLOCK_ID,
      "[Deprecated] HTTP GET",
      "Fetch data from an API",
      "faCloud"
    );
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
        $ref: "https://app.pixiebrix.com/schemas/service#/definitions/configuredServiceOrVar",
        description:
          "Optional. The integration to authenticate the request, if authentication is required",
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

  async transform({
    service,
    ...requestProps
  }: BrickArgs<{
    service: SanitizedIntegrationConfig;
    requestConfig: AxiosRequestConfig;
    _blockArgBrand: never;
  }>): Promise<unknown> {
    if (!isNullOrBlank(service) && typeof service !== "object") {
      throw new PropError(
        "Expected configured service",
        this.id,
        "service",
        service
      );
    }

    const { data } = await performConfiguredRequestInBackground(
      isNullOrBlank(service) ? null : service,
      {
        ...requestProps,
        method: "get",
      }
    );

    return data;
  }
}
