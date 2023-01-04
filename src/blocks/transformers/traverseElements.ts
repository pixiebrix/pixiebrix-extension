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

import { Transformer } from "@/types";
import {
  type BlockArg,
  type BlockOptions,
  type Schema,
  type ElementReference,
} from "@/core";
import { getReferenceForElement } from "@/contentScript/elementReference";
import { propertiesToSchema } from "@/validators/generic";

export class TraverseElements extends Transformer {
  override async isPure(): Promise<boolean> {
    return true;
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/html/traverse",
      "Traverse Elements",
      "Traverse elements in an HTML document using a selector/filter",
      "faCode"
    );
  }

  inputSchema: Schema = propertiesToSchema({
    selector: {
      type: "string",
      format: "selector",
      description: "The selector/filter for the traversal",
    },
    traversal: {
      type: "string",
      description:
        "jQuery traversal type: https://api.jquery.com/category/traversing/tree-traversal/",
      default: "find",
      enum: [
        "closest",
        "children",
        "find",
        "next",
        "nextAll",
        "nextUntil",
        "parent",
        "parents",
        "parentsUntil",
        "prev",
        "prevAll",
        "prevUntil",
        "siblings",
      ],
    },
  });

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      elements: {
        type: "array",
        description: "The array of element references found",
        items: {
          $ref: "https://app.pixiebrix.com/schemas/element#",
        },
      },
      count: {
        type: "integer",
        description: "The number of elements found",
      },
    },
    required: ["elements", "count"],
    additionalProperties: false,
  };

  async transform(
    {
      selector,
      traversal = "find",
    }: BlockArg<{
      selector: string;
      traversal: string;
    }>,
    { ctxt, root }: BlockOptions
  ): Promise<{
    elements: ElementReference[];
    count: number;
  }> {
    // @ts-expect-error -- indexing method of jQuery
    // eslint-disable-next-line security/detect-object-injection -- input validated
    const elements = $(root)[traversal](selector) as JQuery;
    const elementRefs = elements
      .get()
      .map((element) => getReferenceForElement(element));

    return {
      elements: elementRefs,
      count: elementRefs.length,
    };
  }
}

export default TraverseElements;
