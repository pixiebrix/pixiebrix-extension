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

import { Effect } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { boolean } from "@/utils";
import { $safeFind } from "@/helpers";

type ColorRule =
  | string
  | {
      selector: string;
      backgroundColor?: string;
      condition: string | boolean | number;
    };

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
        format: "selector",
      },
      rootMode: {
        type: "string",
        enum: ["document", "inherit"],
        description:
          "Deprecated: configure root mode on common brick options instead",
        // The correct behavior going forward is "inherit". To maintain backward compatability, the brick implementation
        // will default rootMode to "document" if the rootMode argument is not passed in.
        default: "inherit",
      },
      condition: {
        anyOf: [{ type: "string" }, { type: "boolean" }, { type: "number" }],
        description:
          "Deprecated: configure condition on common brick options instead",
      },
      elements: {
        type: "array",
        description: "An array of highlighting sub-rules",
        items: {
          oneOf: [
            {
              type: "string",
              description: "JQuery selector",
              format: "selector",
            },
            {
              type: "object",
              properties: {
                selector: {
                  type: "string",
                  description: "JQuery selector",
                  format: "selector",
                },
                condition: {
                  anyOf: [
                    { type: "string" },
                    { type: "boolean" },
                    { type: "number" },
                  ],
                  description: "Whether or not to apply the highlighting rule",
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
    []
  );

  async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      condition,
      backgroundColor = "#FFFF00",
      rootSelector,
      elements,
      // Default to "document" for backward compatability. New bricks configured in the Page Editor will have
      // rootMode = "inherit" by default (see JSON Schema above)
      rootMode = "document",
    }: BlockArg<{
      rootMode: "document" | "inherit";
      condition: string | number | boolean;
      backgroundColor: string;
      rootSelector: string | undefined;
      elements: ColorRule[];
    }>,
    { root }: BlockOptions
  ): Promise<void> {
    let $roots: JQuery<HTMLElement | Document>;

    if (rootMode === "document") {
      $roots = rootSelector ? $safeFind(rootSelector) : $(document);
    } else {
      $roots = rootSelector ? $safeFind(rootSelector, root) : $(root);
    }

    if (condition !== undefined && !boolean(condition)) {
      return;
    }

    $roots.each(function () {
      const $root = $(this);

      if (elements == null) {
        $root.css({ backgroundColor });
      } else {
        for (const element of elements) {
          if (typeof element === "string") {
            $safeFind(element, $root).css({ backgroundColor });
          } else if (element.condition && boolean(condition)) {
            const {
              selector,
              backgroundColor: elementColor = backgroundColor,
            } = element;
            $safeFind(selector, $root).css({ backgroundColor: elementColor });
          }
        }
      }
    });
  }
}
