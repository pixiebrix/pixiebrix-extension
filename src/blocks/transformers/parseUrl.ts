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
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { pick } from "lodash";
import { isNullOrBlank } from "@/utils";

// Methods imported async in the brick
import type { ParsedDomain } from "psl";
import { BusinessError, getErrorMessage } from "@/errors";

const URL_PROPERTIES = [
  "port",
  "hash",
  "host",
  "hostname",
  "origin",
  "protocol",
  "search",
  "username",
  "password",
  "pathname",
];

export class UrlParser extends Transformer {
  override async isPure(): Promise<boolean> {
    return true;
  }

  defaultOutputKey = "parsedUrl";

  constructor() {
    super(
      "@pixiebrix/parse-url",
      "Parse URL",
      "Parse a URL into its components",
      "faCode"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      url: {
        type: "string",
        description: "An absolute or relative URL",
      },
      base: {
        type: "string",
        description:
          "The base URL to use in cases where the url is a relative URL",
      },
    },
    ["url"]
  );

  override outputSchema: Schema = {
    type: "object",
    properties: {
      searchParams: {
        type: "object",
        additionalProperties: { type: "string" },
      },
      publicSuffix: {
        type: "string",
        description: "Public suffix (see https://publicsuffix.org/)",
      },
      ...Object.fromEntries(
        URL_PROPERTIES.map((prop) => [
          prop,
          {
            type: "string",
          },
        ])
      ),
    },
  };

  async transform({ url, base }: BlockArg): Promise<unknown> {
    const { isValid, parse } = await import(
      /* webpackChunkName: "psl" */ "psl"
    );

    let parsed: URL;

    try {
      // NOTE: this is a transform brick and can support any URL, not just https: URLs. Therefore, we don't need to
      // call our assertHttpsUrl helper method or another method
      parsed = new URL(url, base);
    } catch (error) {
      // URL throws a TypeError on an invalid URL. However, for some reason instance TypeError and instanceof Error
      // both fail for the thrown error. Therefore, just check for an error-like object
      throw new BusinessError(getErrorMessage(error));
    }

    let publicSuffix: string;

    if (!isNullOrBlank(parsed.host)) {
      // `host` includes the port
      const [domain] = parsed.host.split(":");
      if (isValid(domain)) {
        const result = parse(domain);
        if (!("error" in result)) {
          publicSuffix = (result as ParsedDomain).domain;
        }
      }
    }

    const searchParams = Object.fromEntries(parsed.searchParams.entries());

    return {
      ...pick(parsed, URL_PROPERTIES),
      searchParams,
      publicSuffix,
    };
  }
}
