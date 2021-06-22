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

import { Handler } from "htmlmetaparser";
import { Parser } from "htmlparser2";
import { Reader } from "@/types";
import { ReaderOutput, Schema } from "@/core";
import { registerBlock } from "@/blocks/registry";

class PageSemanticReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/document-semantic",
      "Read semantic data",
      "Read HTML metadata, JSON-LD, RDFa, microdata, OEmbed, Twitter cards and AppLinks."
    );
  }

  async read(): Promise<ReaderOutput> {
    return new Promise((resolve, reject) => {
      const handler = new Handler(
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve((result as unknown) as ReaderOutput);
          }
        },
        {
          // The HTML pages URL is used to resolve relative URLs.
          url: document.location.href,
        }
      );

      const parser = new Parser(handler, { decodeEntities: true });
      parser.write(document.documentElement.innerHTML);
      parser.done();
    });
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      alternate: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
            },
            href: {
              type: "string",
            },
          },
        },
      },
    },
  };

  async isAvailable() {
    return true;
  }
}

registerBlock(new PageSemanticReader());
