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

import { isHTMLElement } from "@/bricks/readers/frameworkReader";
import { getReferenceForElement } from "@/contentScript/elementReference";
import { ReaderABC } from "@/types/bricks/readerTypes";
import { type SelectorRoot } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { isInViewport, isVisible } from "@/utils/domUtils";

/**
 * Read attributes, text, etc. from an HTML element.
 *
 * To read the HTML itself, use HtmlReader
 * @see HtmlReader
 */
export class ElementReader extends ReaderABC {
  override defaultOutputKey = "element";

  constructor() {
    super(
      "@pixiebrix/html/element",
      "HTML element reader",
      "Read all attributes and jQuery data from an HTML element",
    );
  }

  async read(elementOrDocument: SelectorRoot) {
    const element = isHTMLElement(elementOrDocument)
      ? elementOrDocument
      : document.body;

    const $elements = $(element);

    return {
      ref: getReferenceForElement(element),
      isVisible: isVisible(element),
      isInViewport: isInViewport(element),
      tagName: element.tagName,
      attrs: Object.fromEntries(
        Object.values(element.attributes).map((x) => [x.name, x.value]),
      ),
      text: $elements.text().trim(),
      data: $elements.data(),
    };
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      ref: {
        $ref: "https://app.pixiebrix.com/schemas/element#",
      },
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
      isVisible: {
        type: "boolean",
        description: "True if the element is visible",
      },
      isInViewport: {
        type: "boolean",
        description: "True if element is completely in the viewport",
      },
    },
    required: [
      "tagName",
      "attrs",
      "data",
      "text",
      "ref",
      "isVisible",
      "isInViewport",
    ],
    additionalProperties: false,
  };

  async isAvailable() {
    return true;
  }
}
