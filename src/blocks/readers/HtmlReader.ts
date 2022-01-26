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
import { ReaderOutput, ReaderRoot, Schema } from "@/core";
import { isHTMLElement } from "@/blocks/readers/frameworkReader";

/**
 * Read HTML from the document or the current element.
 *
 * To get the attributes, data, etc. for the element. See ElementReader
 *
 * @see ElementReader
 */
export class HtmlReader extends Reader {
  defaultOutputKey = "html";

  constructor() {
    super(
      "@pixiebrix/html/read",
      "HTML Reader",
      "Read the HTML for an element/document"
    );
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      innerHTML: {
        type: "string",
        description: "The HTML inside the element/document",
      },
      outerHTML: {
        type: "string",
        description: "The HTML including the element/document",
      },
    },
    required: ["innerHTML", "outerHTML"],
  };

  async isAvailable() {
    return true;
  }

  async isPure(): Promise<boolean> {
    return true;
  }

  async isRootAware(): Promise<boolean> {
    // To support reading HTML from current/inherited element
    return true;
  }

  async read(root: ReaderRoot): Promise<ReaderOutput> {
    const element = isHTMLElement(root) ? root : document.documentElement;

    return {
      outerHTML: element.outerHTML,
      innerHTML: element.innerHTML,
    };
  }
}
