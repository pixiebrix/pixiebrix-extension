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

import { EffectABC } from "@/types/bricks/effectTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import { $safeFind } from "@/utils/domUtils";
import { escapeRegExp } from "lodash";

/**
 * Recursively wrap text in an element and its children. Operates on text nodes. Does not work on text with inline HTML tags.
 */
async function wrapText({
  nodes,
  pattern,
  color,
  isAcrossElements,
}: {
  nodes: HTMLElement[];
  pattern: string | RegExp;
  color: string;
  isAcrossElements: boolean;
}): Promise<void> {
  const { default: Mark } = await import(
    /* webpackChunkName: "mark.js" */
    "mark.js"
  );

  const instance = new Mark(nodes);

  const options = {
    acrossElements: isAcrossElements,
    exclude: ["mark"],
    each(element: HTMLElement) {
      // `mark.js` just adds the `mark` class, need to also add the `background-color` style
      element.style.backgroundColor = color;
      // Don't mark with library-specific data attributes
      element.attributes.removeNamedItem("data-markjs");
    },
  };

  if (typeof pattern === "string") {
    instance.mark(pattern, options);
  } else {
    instance.markRegExp(pattern, options);
  }
}

class HighlightText extends EffectABC {
  static readonly BRICK_ID = validateRegistryId(
    "@pixiebrix/html/highlight-text",
  );

  constructor() {
    super(
      HighlightText.BRICK_ID,
      "Highlight Text",
      "Highlight text within an HTML document or subtree",
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      pattern: {
        title: "Pattern",
        type: "string",
        description: "A string or regular expression to match",
      },
      color: {
        title: "Color",
        type: "string",
        description:
          "The highlight color value or hex code: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value",
        default: "yellow",
        examples: ["yellow", "red", "green"],
      },
      isRegex: {
        title: "Regular Expression",
        type: "boolean",
        description: "Whether the pattern is a regular expression",
        default: false,
      },
      isCaseInsensitive: {
        title: "Case Insensitive",
        type: "boolean",
        description: "Whether the search is case-insensitive",
        default: false,
      },
      isAcrossElements: {
        title: "Match Across Elements",
        type: "boolean",
        description: "Whether to match across HTML elements/styles",
        default: false,
      },
      selector: {
        title: "Selector",
        type: "string",
        format: "selector",
        description:
          "An optional JQuery element selector to limit replacement to document subtree(s)",
      },
    },
    required: ["pattern"],
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      pattern,
      color = "yellow",
      selector,
      isCaseInsensitive = false,
      isAcrossElements = false,
      isRegex = false,
    }: BrickArgs<{
      pattern: string;
      color?: string;
      isCaseInsensitive?: boolean;
      isAcrossElements?: boolean;
      isRegex?: boolean;
      selector?: string;
    }>,
    { root = document }: BrickOptions,
  ): Promise<void> {
    // Don't make replacements outside the `body`, like in `title`
    const { body } = root.ownerDocument ?? root;
    if (root.contains(body)) {
      root = body;
    }

    // Must be a HTMLElement at this point because of the body check above
    const $elements = (
      selector ? $safeFind(selector, root) : $(root)
    ) as JQuery;

    const flags = isCaseInsensitive ? "gi" : "g";

    // eslint-disable-next-line security/detect-non-literal-regexp -- mod argument
    const convertedPattern = new RegExp(
      isRegex ? pattern : escapeRegExp(pattern),
      flags,
    );

    await wrapText({
      nodes: $elements.get(),
      pattern: convertedPattern,
      isAcrossElements,
      color,
    });
  }
}

export default HighlightText;
