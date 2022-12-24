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

import { Effect } from "@/types";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { $safeFind } from "@/helpers";

/**
 * Recursively replace text in an element and its children, without modifying the structure of the document.
 */
export function replaceText({
  node,
  pattern,
  replacement,
  visited,
}: {
  node: Node;
  pattern: string | RegExp;
  replacement: string;
  visited: WeakSet<Node>;
}) {
  // `ownerDocument` is null for documents
  const nodeDocument = node.ownerDocument ?? (node as Document);
  const walker = nodeDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT);

  for (
    let currentNode = walker.nextNode();
    currentNode;
    currentNode = walker.nextNode()
  ) {
    if (visited.has(currentNode)) {
      // Avoid running replaceText on same node twice if selector passed to brick matches multiple nodes
      // in the same subtree
      continue;
    }

    visited.add(currentNode);
    currentNode.textContent = currentNode.textContent.replaceAll(
      pattern,
      replacement
    );
  }
}

class ReplaceTextEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/html/replace-text",
      "Replace Text",
      "Replace text within an HTML document or subtree"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "A string or regular expression to match",
      },
      replacement: {
        type: "string",
        description:
          "A string or replacement pattern: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement",
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
    required: ["pattern", "replacement"],
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      pattern,
      replacement,
      selector,
      isRegex = false,
    }: BlockArg<{
      pattern: string;
      replacement: string;
      isRegex?: boolean;
      selector?: string;
    }>,
    { root }: BlockOptions
  ): Promise<void> {
    const $elements = selector ? $safeFind(selector, root) : $(root);

    const visited = new WeakSet<Node>();
    const convertedPattern = isRegex ? new RegExp(pattern, "g") : pattern;

    for (const element of $elements.get()) {
      replaceText({
        node: element,
        pattern: convertedPattern,
        replacement,
        visited,
      });
    }
  }
}

export default ReplaceTextEffect;
