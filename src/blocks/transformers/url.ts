/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { registerBlock } from "@/blocks/registry";

export const SPACE_ENCODING_DEFAULT = "plus";
const SPACE_ENCODED_VALUE = "%20";

export const URL_INPUT_SPEC: Schema = {
  $schema: "https://json-schema.org/draft/2019-09/schema#",
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "The URL",
      format: "uri",
    },
    params: {
      type: "object",
      description: "URL parameters, will be automatically encoded",
      additionalProperties: { type: ["string", "number"] },
    },
    spaceEncoding: {
      type: "string",
      description: "Encode space using %20 vs. +",
      default: SPACE_ENCODING_DEFAULT,
      enum: ["percent", "plus"],
    },
  },
  required: ["url"],
};

export function makeURL(
  url: string,
  params: Record<string, string | number> | undefined = {},
  spaceEncoding: "plus" | "percent" = SPACE_ENCODING_DEFAULT
): string {
  // https://javascript.info/url#searchparams
  const result = new URL(url);
  for (const [name, value] of Object.entries(params ?? {})) {
    if ((value ?? "") !== "") {
      result.searchParams.append(name, String(value));
    }
  }

  const fullURL = result.toString();

  if (spaceEncoding === "plus" || result.search.length === 0) {
    return fullURL;
  }

  return fullURL.replace(
    result.search,
    result.search.replaceAll("+", SPACE_ENCODED_VALUE)
  );
}

export class UrlCreator extends Transformer {
  constructor() {
    super(
      "@pixiebrix/url",
      "Construct URL",
      "Construct a URL with optional search params",
      "faCode"
    );
  }

  inputSchema: Schema = URL_INPUT_SPEC;

  async transform({
    url,
    params,
    spaceEncoding = SPACE_ENCODING_DEFAULT,
  }: BlockArg): Promise<string> {
    return makeURL(url, params, spaceEncoding);
  }
}

registerBlock(new UrlCreator());
