/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { TransformerABC } from "../../types/bricks/transformerTypes";
import { type BrickArgs } from "../../types/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import { pick } from "lodash";

// Methods imported async in the brick
import type { ParsedDomain } from "psl";
import { getErrorMessage } from "../../errors/errorHelpers";
import { BusinessError } from "../../errors/businessErrors";
import { isNullOrBlank } from "../../utils/stringUtils";
import { propertiesToSchema } from "../../utils/schemaUtils";

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

export class UrlParser extends TransformerABC {
  override async isPure(): Promise<boolean> {
    return true;
  }

  override defaultOutputKey = "parsedUrl";

  constructor() {
    super(
      "@pixiebrix/parse-url",
      "Parse URL",
      "Parse a URL into its components",
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
    ["url"],
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
        ]),
      ),
    },
  };

  async transform({
    url,
    base,
  }: BrickArgs<{ url: string | URL; base?: string | URL }>): Promise<unknown> {
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

    let publicSuffix: string | null = null;

    if (!isNullOrBlank(parsed.host)) {
      // `host` includes the port
      const [domain] = parsed.host.split(":");
      if (domain && isValid(domain)) {
        const result = parse(domain);
        if (!("error" in result)) {
          publicSuffix = (result as ParsedDomain).domain;
        }
      }
    }

    const searchParams: Record<string, string> = {};
    for (const [key, value] of parsed.searchParams.entries()) {
      // eslint-disable-next-line security/detect-object-injection -- Fine because value will always be a string
      searchParams[key] = value;
    }

    return {
      ...pick(parsed, URL_PROPERTIES),
      searchParams,
      publicSuffix,
    };
  }
}
