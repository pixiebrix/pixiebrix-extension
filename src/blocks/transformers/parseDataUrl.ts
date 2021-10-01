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
import { propertiesToSchema } from "@/validators/generic";
import { PropError } from "@/errors";
import { truncate } from "lodash";
import { getEncodingName } from "@/vendors/encodings";
import parseDataUrl from "@/utils/parseDataUrl";

export class ParseDataUrl extends Transformer {
  constructor() {
    super(
      "@pixiebrix/data-url",
      "Parse Data URL",
      "Parse a data: URL, e.g., from a file upload",
      "faCode"
    );
  }

  async isPure(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      url: {
        type: "string",
        format: "data-url",
        description:
          "https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs",
      },
    },
    ["url"]
  );

  outputSchema: Schema = propertiesToSchema({
    mimeType: {
      type: "string",
      description: "The MIME media type",
    },
    encoding: {
      type: "string",
      description: "The encoding used to decode the body",
    },
    body: {
      type: "string",
      description: "The decoded body",
    },
  });

  async transform({ url }: BlockArg): Promise<unknown> {
    const dataURL = parseDataUrl(url);
    if (!dataURL) {
      const maxLength = 50;
      throw new PropError(
        "Invalid data URL",
        this.id,
        "url",
        truncate(url, {
          length: maxLength,
          omission: `[${url.length - maxLength} characters clipped]`,
        })
      );
    }

    const { charset, mimeTypeEssence, body } = dataURL;

    const decoder = new TextDecoder(charset);

    // https://github.com/ashtuchkin/iconv-lite/blob/4a7086f81a3793d8184ce0835008e4f8c7b3ef41/lib/index.js#L35
    const decodedBody = decoder.decode(
      Buffer.from(decodeURIComponent(body), "binary")
    );

    return {
      body: decodedBody,
      mimeType: mimeTypeEssence,
      encoding: getEncodingName(decoder.encoding),
    };
  }
}
