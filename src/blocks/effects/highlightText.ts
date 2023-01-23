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

import { Effect } from "@/types";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { $safeFind } from "@/helpers";
import { validateRegistryId } from "@/types/helpers";
import { getTextNodes } from "@/blocks/effects/replaceText";
import { escape } from "lodash";
import sanitize from "@/utils/sanitize";

const highlightId = validateRegistryId("@pixiebrix/html/highlight-text");

/**
 * Recursively wrap text in an element and its children.
 */
export function wrapText({
  nodes,
  pattern,
  color,
}: {
  nodes: Node[];
  pattern: string | RegExp;
  color: string;
}) {
  for (const textNode of getTextNodes(nodes)) {
    if (textNode.parentElement?.tagName === "MARK") {
      // Don't highlight text that's already highlighted
      continue;
    }

    const fragment = textNode.ownerDocument.createDocumentFragment();
    const div = textNode.ownerDocument.createElement("div");

    const innerHTML = textNode.textContent.replaceAll(
      pattern,
      `<mark style="background-color: ${escape(color)};">$&</mark>`
    );

    if (innerHTML === textNode.textContent) {
      // No replacements made, avoid DOM manipulation for performance
      continue;
    }

    div.innerHTML = sanitize(innerHTML);
    fragment.append(...div.childNodes);
    textNode.replaceWith(fragment);
  }
}

class HighlightText extends Effect {
  constructor() {
    super(
      highlightId,
      "Highlight Text",
      "Highlight text within an HTML document or subtree"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "A string or regular expression to match",
      },
      color: {
        type: "string",
        description:
          "The highlight color value or hex code: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value",
        default: "yellow",
        examples: ["yellow", "red", "green"],
      },
      isRegex: {
        type: "boolean",
        description: "Whether the pattern is a regular expression",
        default: false,
      },
      selector: {
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
      isRegex = false,
    }: BlockArg<{
      pattern: string;
      color?: string;
      isRegex?: boolean;
      selector?: string;
    }>,
    { root }: BlockOptions
  ): Promise<void> {
    // Don't make replacements outside the `body`, like in `title`
    const body = (root as Document).body ?? root.ownerDocument.body;
    if (root.contains(body)) {
      root = body;
    }

    const $elements = selector ? $safeFind(selector, root) : $(root);

    const convertedPattern = isRegex ? new RegExp(pattern, "g") : pattern;

    wrapText({
      nodes: $elements.get(),
      pattern: convertedPattern,
      color,
    });
  }
}

export default HighlightText;
