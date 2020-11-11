/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import { Effect } from "@/types";
import { Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { registerBlock } from "@/blocks/registry";

type ColorRule = string | { selector: string; backgroundColor?: string };

const HEX_PATTERN = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$";

export class HighlightEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/highlight",
      "Highlight",
      "Highlight one or more elements on a page"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      backgroundColor: {
        type: "string",
        default: "#FFFF00",
        description: "Default color hex code",
        pattern: HEX_PATTERN,
      },
      rootSelector: {
        type: "string",
        description: "Optional root selector to find the elements within",
      },
      elements: {
        type: "array",
        items: {
          oneOf: [
            { type: "string", description: "JQuery selector" },
            {
              type: "object",
              properties: {
                selector: {
                  type: "string",
                  description: "JQuery selector",
                },
                backgroundColor: {
                  type: "string",
                  description: "Color hex code",
                  pattern: HEX_PATTERN,
                },
              },
              required: ["selector"],
            },
          ],
        },
      },
    },
    ["elements"]
  );

  async effect({
    backgroundColor = "#FFFF00",
    rootSelector,
    elements,
  }: {
    backgroundColor: string;
    rootSelector: string | undefined;
    elements: ColorRule[];
  }): Promise<void> {
    const $roots = rootSelector ? $(rootSelector) : $(document);

    $roots.each(function () {
      for (const element of elements) {
        if (typeof element === "string") {
          $(this).find(element).css({ backgroundColor });
        } else {
          const { selector, backgroundColor: elementColor } = element;
          $(this).find(selector).css({ backgroundColor: elementColor });
        }
      }
    });
  }
}

registerBlock(new HighlightEffect());
