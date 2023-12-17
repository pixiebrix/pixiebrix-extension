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

import { isHTMLElement } from "@/bricks/readers/frameworkReader";
import { type Schema } from "@/types/schemaTypes";
import { type JsonObject } from "type-fest";
import type { BrickArgs, BrickOptions } from "@/types/runtimeTypes";
import { TransformerABC } from "@/types/bricks/transformerTypes";
import { propertiesToSchema } from "@/validators/generic";
import { isElement, isVisible } from "@/utils/domUtils";

/**
 * Recursively replace the shadow DOM with a <shadow-root> tag.
 *
 * cloneNode(true) doesn't work because it doesn't clone the shadow DOM, even if it's open.
 *
 * Doesn't work with closed shadow DOM. Closed roots are not accessible from JavaScript:
 * https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/mode
 *
 * @param node the node to process
 */
function serializeShadowDOM<T extends Node>(node: T): Node {
  // Replace the shadow DOM with a <shadow-root> tag
  if (isElement(node) && node.shadowRoot) {
    const processed = [...node.shadowRoot.childNodes].map((child) =>
      serializeShadowDOM(child),
    );

    const clone = node.cloneNode(false) as Element;
    const root = document.createElement("shadow-root");
    root.append(...processed);
    clone.append(root);

    return clone;
  }

  if (isElement(node)) {
    const clone = node.cloneNode(true) as Element;

    // Clear children from clone
    while (clone.lastChild) {
      // eslint-disable-next-line unicorn/prefer-dom-node-remove -- keep on the original tree
      clone.removeChild(clone.lastChild);
    }

    for (const childNode of node.childNodes) {
      clone.append(serializeShadowDOM(childNode));
    }

    return clone;
  }

  return node;
}

/**
 * Remove non-visible elements from the tree. Modifies the tree in place.
 * @param node the node to process
 */
function removeNonVisibleElements(node: Node): Node {
  if (isElement(node)) {
    const style = window.getComputedStyle(node);

    // Discussion: https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
    if (
      !isVisible(node as HTMLElement) ||
      style.display === "none" ||
      style.visibility !== "hidden"
    ) {
      node.remove();
    }

    // eslint-disable-next-line unicorn/no-useless-spread -- shallow clone because we're modifying the children in place
    for (const child of [...node.children]) {
      removeNonVisibleElements(child);
    }
  }

  return node;
}

/**
 * An HTML Transformer brick to support scraping and automation use cases.
 *
 * As compared to HtmlReader, this brick includes controls for the HTML output. Introduced because the HtmlReader is a
 * reader so doesn't support configured options.
 *
 * The philosophy of this brick is to provide affordances that require access to the original DOM.
 *
 * Transformations not requiring the DOM, can be implemented via the JavaScript brick. For example:
 * - Excluding comments
 * - Excluding tags (e.g., img, svg, etc.)
 * - Excluding attributes (e.g., class, etc.)
 *
 * @see HtmlReader
 * @since 1.8.6
 */
class HtmlTransformer extends TransformerABC {
  defaultOutputKey = "html";

  constructor() {
    super(
      "@pixiebrix/html/extract",
      "[Experimental] Extract DOM",
      "Extract the DOM for an element/document",
    );
  }

  override inputSchema: Schema = propertiesToSchema({
    includeNonVisible: {
      type: "boolean",
      description: "Whether to include non-visible elements",
      default: true,
    },
    includeShadowDOM: {
      type: "boolean",
      description: "Whether to include open Shadow DOM",
      // Default to false, because it produces a tag placeholder
      default: true,
    },
  });

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      html: {
        type: "string",
        description: "The HTML including the element/document",
      },
    },
    required: ["innerHTML", "outerHTML"],
  };

  override async isPure(): Promise<boolean> {
    return true;
  }

  override async isRootAware(): Promise<boolean> {
    // To support reading HTML from current/inherited element
    return true;
  }

  async transform(
    {
      includeShadowDOM = true,
      includeNonVisible = true,
    }: BrickArgs<{ includeShadowDOM?: boolean; includeNonVisible?: boolean }>,
    { root }: BrickOptions,
  ): Promise<JsonObject> {
    let element = isHTMLElement(root) ? root : document.documentElement;

    if (includeShadowDOM) {
      element = serializeShadowDOM(element) as HTMLElement;
    }

    if (!includeNonVisible) {
      element = removeNonVisibleElements(
        element.cloneNode(true),
      ) as HTMLElement;
    }

    return {
      outerHTML: element.outerHTML,
      innerHTML: element.innerHTML,
    };
  }
}

export default HtmlTransformer;
