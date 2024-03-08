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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { compact } from "lodash";
import {
  $safeFindElementsWithRootMode,
  IS_ROOT_AWARE_BRICK_PROPS,
} from "@/bricks/rootModeHelpers";
import { propertiesToSchema } from "@/utils/schemaUtils";

function isCheckbox(
  element: HTMLInputElement | HTMLTextAreaElement,
): element is HTMLInputElement {
  return element.type === "checkbox";
}

export class FormData extends TransformerABC {
  override defaultOutputKey = "form";

  constructor() {
    super(
      "@pixiebrix/forms/data",
      "Read data from a form",
      "Read data from all inputs on a form",
    );
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      selector: {
        type: "string",
        format: "selector",
        description: "jQuery selector for the form",
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    [],
  );

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    additionalProperties: true,
  };

  async transform(
    { selector, isRootAware = false }: BrickArgs,
    { root }: BrickOptions,
  ): Promise<UnknownObject> {
    const $elements = $safeFindElementsWithRootMode({
      selector,
      isRootAware,
      root,
      blockId: this.id,
    });

    const result = $elements
      .find<HTMLInputElement | HTMLTextAreaElement>(":input")
      .get()
      .map((input): [string, string | boolean] | undefined => {
        if (!input.name) {
          return;
        }

        if (!isCheckbox(input)) {
          return [input.name, input.value];
        }

        // Cast `"on"` to `true`, un-checked to `false`
        const value = input.checked && (input.value === "on" || input.value);
        return [input.name, value];
      });

    return Object.fromEntries(compact(result));
  }
}
