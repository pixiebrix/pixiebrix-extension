/*
 * Copyright (C) 2021 Pixie Brix, LLC
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
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { pick } from "lodash";
import psl, { ParsedDomain } from "psl";

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

  async transform({ url, base }: BlockArg): Promise<unknown> {
    const parsed = new URL(url, base);

    let publicSuffix: string;

    if (parsed.host ?? "" !== "") {
      const domain = parsed.host.split(":")[0];
      if (psl.isValid(domain)) {
        const result = psl.parse(domain);
        if (!("error" in result)) {
          publicSuffix = (result as ParsedDomain).domain;
        }
      }
    }

    const searchParams: Record<string, string> = {};
    for (const [key, value] of parsed.searchParams.entries()) {
      // fine because value will always be a string
      // eslint-disable-next-line security/detect-object-injection
      searchParams[key] = value;
    }

    return {
      ...pick(parsed, URL_PROPERTIES),
      searchParams,
      publicSuffix,
    };
  }
}

registerBlock(new UrlParser());
