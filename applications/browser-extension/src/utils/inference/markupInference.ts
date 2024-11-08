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

import {
  EXTENSION_POINT_DATA_ATTR,
  PANEL_FRAME_ID,
  PIXIEBRIX_DATA_ATTR,
} from "../../domConstants";
import { BUTTON_TAGS, UNIQUE_ATTRIBUTES } from "./selectorInference";
import { compact, intersection, unary, uniq } from "lodash";
import { BusinessError } from "../../errors/businessErrors";
import { isNullOrBlank, matchesAnyPattern } from "../stringUtils";
import { mostCommonElement } from "../arrayUtils";
import { assertNotNullish } from "../nullishUtils";

const BUTTON_SELECTORS: string[] = ["[role='button']"];
const ICON_TAGS = ["svg", "img"];
const CAPTION_TAGS = ["td", "a", "li", "span"];
const MULTI_ATTRS = ["class", "rel"];

/** Layout tags that should be preserved during panel inference */
const ATTR_SKIP_ELEMENT_PATTERNS = [
  /^chevron-down$/,
  /^([\dA-Za-z]+)-chevron-down$/,
];

// Use `number` type to support includes() check
const NON_RENDERED_NODES: number[] = [
  Node.COMMENT_NODE,
  Node.CDATA_SECTION_NODE,
];

/**
 * Attribute names to exclude from button/panel template inference.
 *
 * NOTE: This is a different list than what we use for inferring selectors in safeCssSelector
 *
 * @see commonAttribute
 */
const TEMPLATE_ATTR_EXCLUDE_PATTERNS = [
  ...UNIQUE_ATTRIBUTES,

  EXTENSION_POINT_DATA_ATTR,
  PIXIEBRIX_DATA_ATTR,

  // Angular attributes
  /^_ngcontent-/,
  /^_nghost-/,
  /^ng-/,

  // Exclude tabindex to avoid breaking standard tab navigation
  "tabindex",

  // Exclude non-role aria attributes because they're generally unique across elements
  /^aria-(?!role).*$/,
];
const TEMPLATE_VALUE_EXCLUDE_PATTERNS = new Map<string, RegExp[]>([
  ["class", [/^ember-view$/]],
  // eslint-disable-next-line security/detect-non-literal-regexp -- Our variables
  ["id", [new RegExp(`^${PANEL_FRAME_ID}$`)]],
]);

class SkipElement extends Error {
  override name = "SkipElement";
}

function outerHTML(element: Element | string): string {
  if (typeof element === "string") {
    return element;
  }

  return element.outerHTML;
}

function newElement(tagName: string): Element {
  return document.createElement(tagName);
}

function commonAttribute(items: Element[], attribute: string) {
  const attributeValues = items.map(
    (x) => x.attributes.getNamedItem(attribute)?.value,
  );

  let unfiltered: string[];

  // For classes and rel we take the common values
  if (MULTI_ATTRS.includes(attribute)) {
    const classNames = attributeValues.map((x) => (x ? x.split(" ") : []));
    unfiltered = intersection(...classNames);
  } else if (uniq(attributeValues).length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check above
    unfiltered = attributeValues[0]!.split(" ");
  } else {
    // Single attribute doesn't match
    return null;
  }

  const exclude = TEMPLATE_VALUE_EXCLUDE_PATTERNS.get(attribute) ?? [];

  const filtered = unfiltered.filter(
    (value) => !matchesAnyPattern(value, exclude),
  );

  return filtered.length > 0 ? filtered.join(" ") : null;
}

function setCommonAttributes(common: Element, items: Element[]) {
  const { attributes } = items[0] ?? {};
  assertNotNullish(attributes, "No attributes found");

  // Find the common attributes between the elements
  for (const { name } of attributes) {
    if (matchesAnyPattern(name, TEMPLATE_ATTR_EXCLUDE_PATTERNS)) {
      continue;
    }

    const value = commonAttribute(items, name);
    if (value != null) {
      if (
        value
          .split(" ")
          .some((value) => matchesAnyPattern(value, ATTR_SKIP_ELEMENT_PATTERNS))
      ) {
        throw new SkipElement(
          "Attribute value contains value in the skip list",
        );
      }

      common.setAttribute(name, value);
    }
  }
}

function ignoreDivChildNode(node: Node): boolean {
  return (
    NON_RENDERED_NODES.includes(node.nodeType) ||
    (node.nodeType === Node.TEXT_NODE &&
      (node.textContent == null || node.textContent.trim() === ""))
  );
}

function removeUnstyledLayout(node: Node): Node | null {
  if (NON_RENDERED_NODES.includes(node.nodeType)) {
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    const nonEmptyChildren = [...node.childNodes].filter(
      (x) => !ignoreDivChildNode(x),
    );
    if (
      // This is a bit of a hack - the DIV element may impact layout because it's a block element
      ["DIV"].includes(element.tagName) &&
      isNullOrBlank(element.className) &&
      nonEmptyChildren.length === 1
    ) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check above
      return removeUnstyledLayout(nonEmptyChildren[0]!);
    }

    const clone = node.cloneNode(false) as Element;
    for (const childNode of node.childNodes) {
      const newChild = removeUnstyledLayout(childNode);
      if (newChild != null) {
        clone.append(newChild);
      }
    }

    return clone;
  }

  return node.cloneNode(false);
}

/**
 * Recursively extract common HTML template from one or more buttons/menu item.
 * @param items jQuery of HTML elements
 * @param captioned true, if the generated HTML template already includes a caption
 * placeholder
 */
function commonButtonStructure(
  items: Element[],
  captioned = false,
): [Element | string, boolean] {
  let currentCaptioned = captioned;

  const proto = items[0];
  assertNotNullish(proto, "No elements provided");

  if (ICON_TAGS.includes(proto.tagName.toLowerCase())) {
    // TODO: need to provide a way of adding additional classes to the button. E.g. some classes
    //  may provide for the margin, etc.
    return ["{{{ icon }}}", currentCaptioned];
  }

  const common = newElement(proto.tagName);

  try {
    setCommonAttributes(common, items);
  } catch (error) {
    if (error instanceof SkipElement) {
      // Shouldn't happen at the top level
      return ["", currentCaptioned];
    }

    throw error;
  }

  // Heuristic that assumes elements match from the beginning
  for (
    let nodeIndex = 0, elementIndex = 0;
    nodeIndex < proto.childNodes.length;
    nodeIndex++
  ) {
    const protoChild = proto.childNodes.item(nodeIndex);

    if (
      protoChild.nodeType === Node.TEXT_NODE &&
      !currentCaptioned &&
      protoChild.textContent &&
      protoChild.textContent?.trim() !== ""
    ) {
      common.append("{{{ caption }}}");
      currentCaptioned = true;
    } else if (
      protoChild.nodeType === Node.ELEMENT_NODE &&
      items.every((x) => elementIndex < x.children.length) &&
      uniq(items.map((x) => x.children.item(elementIndex)?.tagName)).length ===
        1
    ) {
      const children = compact(
        items.map((element) => element.children.item(elementIndex)),
      );

      const [child, childCaptioned] = commonButtonStructure(
        children,
        currentCaptioned,
      );
      common.append(child);
      currentCaptioned ||= childCaptioned;

      elementIndex++;
    }
  }

  if (proto.tagName === "A") {
    common.setAttribute("href", "#");
  }

  if (
    !currentCaptioned &&
    common.childElementCount === 0 &&
    CAPTION_TAGS.includes(proto.tagName.toLowerCase())
  ) {
    common.append("{{{ caption }}}");
    currentCaptioned = true;
  }

  return [common, currentCaptioned];
}

function commonButtonHTML(tag: string, items: Element[]): string {
  if (items.length === 0) {
    throw new Error("No items provided");
  }

  const elements = items
    .map(unary(removeUnstyledLayout))
    .filter(
      (x): x is Element => Boolean(x) && x?.nodeType === Node.ELEMENT_NODE,
    );

  const [common] = commonButtonStructure(elements);

  return outerHTML(common);
}

export function inferButtonHTML(
  container: HTMLElement,
  selected: HTMLElement[],
): string {
  const $container = $(container);

  if (selected.length === 0) {
    throw new BusinessError(
      "One or more prototype button-like elements required",
    );
  }

  if (selected.length > 1) {
    const children = containerChildren($container, selected);
    // Vote on the root tag
    const tag = mostCommonElement(selected.map((x) => x.tagName)).toLowerCase();
    return commonButtonHTML(tag, children);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check above
  const element = selected[0]!;
  for (const buttonTag of [...BUTTON_SELECTORS, ...BUTTON_TAGS]) {
    const $items = $container.children(buttonTag);
    if (
      $items.length > 0 &&
      ($items.is(element) || $items.has(element).length > 0)
    ) {
      if (buttonTag === "input") {
        const commonType = commonAttribute($items.get(), "type") ?? "button";
        const inputType = ["submit", "reset"].includes(commonType)
          ? "button"
          : commonType;
        return `<input type="${inputType}" value="{{{ caption }}}" />`;
      }

      return commonButtonHTML(buttonTag, $items.get());
    }
  }

  throw new BusinessError(
    `Did not find any button-like tags in container ${container.tagName}`,
  );
}

/**
 * Find direct children of the container that contain each selected descendent element
 * @param $container the panel container
 * @param selected the selected descendent elements
 */
function containerChildren(
  $container: JQuery,
  selected: HTMLElement[],
): HTMLElement[] {
  return compact(
    selected.map((element) => {
      const exactMatch = $container.children().filter(function () {
        return this === element;
      });

      if (exactMatch.length > 0) {
        return exactMatch.get(0);
      }

      const match = $container.children().has(element);

      if (match.length === 0) {
        throw new Error("element not found in container");
      }

      return match.get(0);
    }),
  );
}
