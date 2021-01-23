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

import { uniq, compact, sortBy, partial } from "lodash";
const BUTTON_TAGS: string[] = ["li", "button", "a", "span", "input", "svg"];
const BUTTON_SELECTORS: string[] = ["[role='button']"];
const ICON_TAGS = ["svg"];
const MENU_TAGS = ["ul", "tbody"];
const CAPTION_TAGS = ["td", "a", "li", "span"];
const MULTI_ATTRS = ["class", "rel"];

const ATTR_EXCLUDE_PATTERNS = [
  /^data([\w-]*)-test([\w-]*)$/,
  /^data-cy$/,
  /^tabindex$/,
  /^id$/,
];

const VALUE_EXCLUDE_PATTERNS = new Map<string, RegExp[]>([
  ["class", [/^ember-view$/]],
]);

// @ts-ignore: no types available
import getCssSelector from "css-selector-generator";

function intersection<T>(sets: Set<T>[]): Set<T> {
  return sets.reduce((acc, other) => {
    return acc == null ? other : new Set([...acc].filter((x) => other.has(x)));
  }, null);
}

function commonAttr($items: JQuery<HTMLElement>, attr: string) {
  const attributeValues = $items
    .toArray()
    .map((x) => x.attributes.getNamedItem(attr)?.value);

  let unfiltered: string[];

  // For classes and rel we take the common values
  if (MULTI_ATTRS.includes(attr)) {
    const classNames = attributeValues.map(
      (x) => new Set(x ? x.split(" ") : [])
    );
    const commonValues = intersection(classNames);
    unfiltered = Array.from(commonValues.values());
  } else if (uniq(attributeValues).length === 1) {
    unfiltered = attributeValues[0].split(" ");
  } else {
    // Single attribute doesn't match
    return null;
  }

  const exclude = VALUE_EXCLUDE_PATTERNS.get(attr) ?? [];

  const filtered = unfiltered.filter(
    (value) => !exclude.some((regex) => regex.test(value))
  );

  return filtered.length > 0 ? filtered.join(" ") : null;
}

/**
 * Recursively extract common HTML template from one or more HTML items.
 * @param $items JQuery of HTML elements
 * @param captioned true, if the generated HTML template already includes a caption
 * placeholder
 */
function commonStructure(
  $items: JQuery<HTMLElement>,
  captioned = false
): JQuery<HTMLElement | Text> {
  const proto = $items.get(0);

  if (ICON_TAGS.includes(proto.tagName.toLowerCase())) {
    // TODO: need to provide a way of adding additional classes to the button. E.g. some classes
    //  may provide for the margin, etc.
    return $(document.createTextNode(`{{{ icon }}}`));
  }

  const $common = $(`<${proto.tagName.toLowerCase()}>`);

  const attributes = proto.attributes;

  // Find the common attributes between the elements
  for (const attrIndex in Object.keys(attributes)) {
    // safe because we're getting from Object.keys
    // eslint-disable-next-line security/detect-object-injection
    const attrName = attributes[attrIndex].name;

    if (ATTR_EXCLUDE_PATTERNS.some((x) => x.test(attrName))) {
      continue;
    }

    const value = commonAttr($items, attrName);
    if (value != null) {
      $common.attr(attrName, value);
    }
  }

  // Heuristic that assumes tag matches from the beginning
  for (let i = 0; i < proto.children.length; i++) {
    if (
      $items.toArray().every((x) => i < x.children.length) &&
      uniq($items.toArray().map((x) => x.children.item(i).tagName)).length === 1
    ) {
      const $children = $items.map(function () {
        return this.children.item(i) as HTMLElement;
      });
      $common.append(commonStructure($children, captioned));
    }
  }

  if (proto.tagName === "A") {
    $common.attr("href", "#");
  }

  if (
    !captioned &&
    !$common.children().length &&
    CAPTION_TAGS.includes(proto.tagName.toLowerCase())
  ) {
    $common.append(document.createTextNode("{{{ caption }}}"));
  } else if (
    !captioned &&
    $(proto)
      .contents()
      .get()
      .some((x) => x.nodeType === Node.TEXT_NODE)
  ) {
    $common.append(document.createTextNode("{{{ caption }}}"));
  }

  return $common;
}

function commonHTML(tag: string, $items: JQuery<HTMLElement>): string {
  if ($items.length === 0) {
    throw new Error(`No items provided`);
  }

  const $common = commonStructure($items);

  // Trick to get the HTML of the actual element
  return $("<div>").append($common.clone()).html();
}

// https://gist.github.com/getify/3667624
function escapeDoubleQuotes(str: string): string {
  return str.replace(/\\([\s\S])|(")/g, "\\$1$2");
}

export function safeCssSelector(
  element: HTMLElement,
  selectors: string[] = [],
  root: Element = undefined
): string {
  // https://github.com/fczbkk/css-selector-generator
  return getCssSelector(element, {
    blacklist: ["#ember*"],
    selectors: selectors,
    combineWithinSelector: true,
    combineBetweenSelectors: true,
    // convert null to undefined, because getCssSelector bails otherwise
    root: root ?? undefined,
  });
}

/**
 * Generate some CSS selector variants for an element.
 */
export function inferSelectors(
  element: HTMLElement,
  root: Element = undefined
): string[] {
  const makeSelector = partial(
    safeCssSelector,
    element,
    partial.placeholder,
    root
  );
  return sortBy(
    uniq(
      compact([
        makeSelector(["id", "class", "tag", "attribute", "nthchild"]),
        makeSelector(["tag", "class", "attribute", "nthchild"]),
        makeSelector(["id", "tag", "attribute", "nthchild"]),
        makeSelector(["id", "tag", "attribute"]),
        makeSelector(undefined),
      ])
    ).filter((x) => x.trim() !== ""),
    (x) => x.length
  );
}

/**
 * Returns true if selector uniquely identifies an element on the page
 */
function isUniqueSelector(selector: string): boolean {
  return $(document).find(selector).length === 1;
}

export function getCommonAncestor(...args: Node[]): Node {
  if (args.length === 1) {
    return args[0].parentNode;
  }

  const [node, ...otherNodes] = args;

  let currentNode: Node | null = node;

  while (currentNode) {
    if (otherNodes.every((x) => currentNode.contains(x))) {
      return currentNode;
    }
    currentNode = currentNode?.parentNode;
  }

  return null;
}

export function findContainerForElement(
  element: HTMLElement
): { container: HTMLElement; selectors: string[] } {
  let container = element;
  let level = 0;

  if (BUTTON_TAGS.includes(element.tagName.toLowerCase())) {
    container = element.parentElement;
    level++;
  }

  /**
   * If the direct parent is a list item or column, that's most li
   */
  if (MENU_TAGS.includes(container.parentElement.tagName.toLowerCase())) {
    container = container.parentElement;
    level++;
  }

  const extra: string[] = [];

  if (container !== element) {
    const descendent = level == 1 ? ">" : "> * >";

    if (element.tagName === "INPUT") {
      extra.push(
        `${container.tagName.toLowerCase()}:has(${descendent} input[value="${escapeDoubleQuotes(
          element.getAttribute("value")
        )}"])`
      );
    } else {
      extra.push(
        `${container.tagName.toLowerCase()}:has(${descendent} ${element.tagName.toLowerCase()}:contains("${escapeDoubleQuotes(
          $(element).text().trim()
        )}"))`
      );
    }
  }

  return {
    container,
    selectors: uniq([
      ...extra.filter(isUniqueSelector),
      ...inferSelectors(container),
    ]),
  };
}

export function findContainer(
  elements: HTMLElement[]
): { container: HTMLElement; selectors: string[] } {
  if (elements.length > 1) {
    const container = getCommonAncestor(...elements) as HTMLElement | null;
    if (!container) {
      throw new Error("Selected elements have no common ancestors");
    }
    return {
      container,
      selectors: inferSelectors(container),
    };
  } else {
    return findContainerForElement(elements[0]);
  }
}

export function inferPanelHTML(
  container: HTMLElement,
  selected: HTMLElement[]
): string {
  return "<div><h1>{{heading}}</h1><div>{{{body}}}</div></div>";
}

export function inferButtonHTML(
  container: HTMLElement,
  selected: HTMLElement[]
): string {
  const $container = $(container);

  if (selected.length > 1) {
    const children = selected.map((element) => {
      const exactMatch = $container.children().filter(function () {
        return this === element;
      });

      if (exactMatch.length) {
        return exactMatch.get(0);
      }

      const match = $container.children().has(element);

      if (!match.length) {
        throw new Error("element not found in container");
      }

      return match.get(0);
    });
    return commonHTML(selected[0].tagName, $(children));
  }

  for (const tag of [...BUTTON_SELECTORS, ...BUTTON_TAGS]) {
    const $items = $container.children(tag);

    if ($items.length) {
      if (tag === "input") {
        const commonType = commonAttr($items, "type") ?? "button";
        const inputType = ["submit", "reset"].includes(commonType)
          ? "button"
          : commonType;
        return `<input type="${inputType}" value="{{{ caption }}}" />`;
      }
      return commonHTML(tag, $items);
    }
  }

  throw new Error(
    `Did not find any button-like tags in container ${container.tagName}`
  );
}
