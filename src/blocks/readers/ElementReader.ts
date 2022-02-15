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

import { Reader } from "@/types";
import { ReaderRoot, Schema } from "@/core";
import { isHTMLElement } from "@/blocks/readers/frameworkReader";

/**
 * Read attributes, text, etc. from an HTML element.
 *
 * To read the HTML itself, use HtmlReader
 * @see HtmlReader
 */
export class ElementReader extends Reader {
  defaultOutputKey = "element";

  constructor() {
    super(
      "@pixiebrix/html/element",
      "HTML element reader",
      "Read all attributes and JQuery data from an HTML element"
    );
  }

  async read(elementOrDocument: ReaderRoot) {
    const element = isHTMLElement(elementOrDocument)
      ? elementOrDocument
      : document.body;
    const $element = $(element);

    return {
      tagName: element.tagName,
      attrs: Object.fromEntries(
        Object.values(element.attributes).map((x) => [x.name, x.value])
      ),
      text: $element.text().trim(),
      data: $element.data(),
    };
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      tagName: {
        type: "string",
      },
      text: {
        type: "string",
        description:
          "The combined text contents of element, including its descendants. See https://api.jquery.com/text/",
      },
      attrs: {
        type: "object",
        additionalProperties: { type: "string" },
      },
      data: {
        type: "object",
        additionalProperties: true,
      },
    },
    required: ["tagName", "attrs", "data", "text"],
    additionalProperties: false,
  };

  async isAvailable() {
    return true;
  }
}
