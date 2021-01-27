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
import getCssSelector, { css_selector_type } from "css-selector-generator";

const BUTTON_TAGS: string[] = ["li", "button", "a", "span", "input", "svg"];
const BUTTON_SELECTORS: string[] = ["[role='button']"];
const ICON_TAGS = ["svg", "img"];
const MENU_TAGS = ["ul", "tbody"];
const CAPTION_TAGS = ["td", "a", "li", "span"];
const MULTI_ATTRS = ["class", "rel"];
const HEADER_TAGS = ["header", "h1", "h2", "h3", "h4", "h5", "h6"];
// Layout tags that should be preserved during panel inference
const LAYOUT_TAGS = ["section", "header", "div", "article", "aside"];
const TEXT_TAGS = ["span", "p", "b", "h1", "h2", "h3", "h4", "h5", "h6"];

const ATTR_EXCLUDE_PATTERNS = [
  /^id$/,
  /^name$/,
  /^data([\w-]*)-test([\w-]*)$/,
  // Cypress attributes
  /^data-cy$/,
  // Angular attributes
  /^_ngcontent-.*/,
  /^_nghost-.*/,
  /^ng-.*/,
  // Exclude tabindex to avoid breaking standard tab navigation
  /^tabindex$/,
  // Exclude non-role aria attributes because they're generally unique across elements
  /^aria-(?!role).*$/,
];

const VALUE_EXCLUDE_PATTERNS = new Map<string, RegExp[]>([
  ["class", [/^ember-view$/]],
]);

function intersection<T>(sets: Set<T>[]): Set<T> {
  return sets.reduce((acc, other) => {
    return acc == null ? other : new Set([...acc].filter((x) => other.has(x)));
  }, null);
}

function outerHTML($element: JQuery<HTMLElement | Text>): string {
  // Trick to get the HTML of the actual element
  return $("<div>").append($element.clone()).html();
}

function escapeDoubleQuotes(str: string): string {
  // https://gist.github.com/getify/3667624
  return str.replace(/\\([\s\S])|(")/g, "\\$1$2");
}

/**
 * Returns true iff any of the immediate children are text nodes.
 * @param $element
 */
function hasTextNodeChild($element: JQuery<HTMLElement>): boolean {
  return $element
    .contents()
    .get()
    .some((x) => x.nodeType === Node.TEXT_NODE);
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

function setCommonAttrs(
  $common: JQuery<HTMLElement>,
  $items: JQuery<HTMLElement>
) {
  const proto = $items.get(0);

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
}

/**
 * Recursively extract common HTML template from one or more buttons/menu item.
 * @param $items JQuery of HTML elements
 * @param captioned true, if the generated HTML template already includes a caption
 * placeholder
 */
function commonButtonStructure(
  $items: JQuery<HTMLElement>,
  captioned = false
): [JQuery<HTMLElement | Text>, boolean] {
  let currentCaptioned = captioned;
  const proto = $items.get(0);

  if (ICON_TAGS.includes(proto.tagName.toLowerCase())) {
    // TODO: need to provide a way of adding additional classes to the button. E.g. some classes
    //  may provide for the margin, etc.
    return [$(document.createTextNode(`{{{ icon }}}`)), currentCaptioned];
  }

  const $common = $(`<${proto.tagName.toLowerCase()}>`);

  setCommonAttrs($common, $items);

  // Heuristic that assumes tag matches from the beginning
  for (let i = 0; i < proto.children.length; i++) {
    if (
      $items.toArray().every((x) => i < x.children.length) &&
      uniq($items.toArray().map((x) => x.children.item(i).tagName)).length === 1
    ) {
      const $children = $items.map(function () {
        return this.children.item(i) as HTMLElement;
      });

      const [child, childCaptioned] = commonButtonStructure(
        $children,
        currentCaptioned
      );
      $common.append(child);
      currentCaptioned ||= childCaptioned;
    }
  }

  if (proto.tagName === "A") {
    $common.attr("href", "#");
  }

  if (
    !currentCaptioned &&
    !$common.children().length &&
    CAPTION_TAGS.includes(proto.tagName.toLowerCase())
  ) {
    $common.append(document.createTextNode("{{{ caption }}}"));
    currentCaptioned = true;
  } else if (!currentCaptioned && hasTextNodeChild($(proto))) {
    $common.append(document.createTextNode("{{{ caption }}}"));
    currentCaptioned = true;
  }

  return [$common, currentCaptioned];
}

type PanelStructureState = {
  inHeader: boolean;
  bodyInserted: boolean;
  headingInserted: boolean;
};

/**
 * Recursively extract common HTML template from one ore more panels.
 * @param $items JQuery of HTML elements
 * @param state current traversal/insertion state
 */
function commonPanelStructure(
  $items: JQuery<HTMLElement>,
  state: PanelStructureState = {
    inHeader: false,
    headingInserted: false,
    bodyInserted: false,
  }
): [JQuery<HTMLElement | Text>, PanelStructureState] {
  const proto = $items.get(0);
  const inHeader =
    state.inHeader || HEADER_TAGS.includes(proto.tagName.toLowerCase());
  let headingInserted = state.headingInserted;
  let bodyInserted = state.bodyInserted;

  const $common = $(`<${proto.tagName.toLowerCase()}>`);

  setCommonAttrs($common, $items);

  // Heuristic that assumes tag matches from the beginning
  for (let i = 0; i < proto.children.length; i++) {
    const protoChild = proto.children.item(i) as HTMLElement;
    const $protoChild = $(protoChild);

    if (
      $items.toArray().every((x) => i < x.children.length) &&
      uniq($items.toArray().map((x) => x.children.item(i).tagName)).length ===
        1 &&
      (!headingInserted ||
        LAYOUT_TAGS.includes(proto.children.item(i).tagName.toLowerCase()))
    ) {
      const $children = $items.map(function () {
        return this.children.item(i) as HTMLElement;
      });
      const [inner, innerState] = commonPanelStructure($children, {
        bodyInserted,
        headingInserted,
        inHeader,
      });
      bodyInserted = innerState.bodyInserted;
      headingInserted = innerState.headingInserted;
      $common.append(inner);
    } else if (
      !headingInserted &&
      HEADER_TAGS.some((tag) => $protoChild.has(tag))
    ) {
      const [header] = buildHeader(protoChild);
      $common.append(header);
      headingInserted = true;
    } else if (
      !inHeader &&
      !bodyInserted &&
      !LAYOUT_TAGS.includes(proto.children.item(i).tagName.toLowerCase())
    ) {
      $common.append(document.createTextNode("{{{ body }}}"));
      bodyInserted = true;
    }
  }

  if (inHeader && !headingInserted && hasTextNodeChild($(proto))) {
    $common.append(document.createTextNode("{{{ heading }}}"));
    headingInserted = true;
  }

  return [$common, { inHeader, bodyInserted, headingInserted }];
}

function buildHeader(proto: HTMLElement): [JQuery<HTMLElement>, boolean] {
  const tag = proto.tagName.toLowerCase();
  const $inferred = $(`<${tag}>`);
  setCommonAttrs($inferred, $(proto));

  let inserted = false;

  for (let i = 0; i < proto.children.length; i++) {
    const child = proto.children.item(i) as HTMLElement;

    // Recurse structurally
    const [childHeader, childInserted] = buildHeader(child);
    $inferred.append(childHeader);
    inserted ||= childInserted;
  }

  if (!inserted && TEXT_TAGS.includes(tag) && hasTextNodeChild($(proto))) {
    $inferred.append(document.createTextNode("{{{ heading }}}"));
    inserted = true;
  }

  return [$inferred, inserted];
}

function buildBody(proto: HTMLElement): [JQuery<HTMLElement | Text>, boolean] {
  let inserted = false;

  const tag = proto.tagName.toLowerCase();

  if (!LAYOUT_TAGS.includes(tag)) {
    return [$(document.createTextNode("{{{ body }}}")), true];
  }

  const $inferred = $(`<${proto.tagName.toLowerCase()}>`);
  setCommonAttrs($inferred, $(proto));

  for (let i = 0; i < proto.children.length; i++) {
    const child = proto.children.item(i) as HTMLElement;
    const childTag = child.tagName.toLowerCase();

    if (LAYOUT_TAGS.includes(childTag)) {
      const [childElement, childInserted] = buildBody(child);
      inserted ||= childInserted;
      $inferred.append(childElement);
    } else if (!inserted && !LAYOUT_TAGS.includes(childTag)) {
      inserted = true;
      $inferred.append(document.createTextNode("{{{ body }}}"));
    }
  }

  return [$inferred, inserted];
}

export function buildSinglePanelElement(
  proto: HTMLElement,
  state: PanelStructureState = {
    inHeader: false,
    headingInserted: false,
    bodyInserted: false,
  }
): [JQuery<HTMLElement>, PanelStructureState] {
  let headingInserted = state.headingInserted;
  let bodyInserted = false;

  const $inferred = $(`<${proto.tagName.toLowerCase()}>`);
  setCommonAttrs($inferred, $(proto));

  for (let i = 0; i < proto.children.length; i++) {
    const child = proto.children.item(i) as HTMLElement;
    const $child = $(child);

    if (!headingInserted && HEADER_TAGS.some((tag) => $child.has(tag))) {
      const [header] = buildHeader(child);
      $inferred.append(header);
      headingInserted = true;
    } else if (headingInserted && !bodyInserted) {
      const [childBody, childInserted] = buildBody(child);
      $inferred.append(childBody);
      bodyInserted ||= childInserted;
    }
  }

  return [$inferred, { inHeader: false, headingInserted, bodyInserted }];
}

function commonButtonHTML(tag: string, $items: JQuery<HTMLElement>): string {
  if ($items.length === 0) {
    throw new Error(`No items provided`);
  }

  const [$common] = commonButtonStructure($items);

  // Trick to get the HTML of the actual element
  return $("<div>").append($common.clone()).html();
}

function commonPanelHTML(tag: string, $items: JQuery<HTMLElement>): string {
  if ($items.length === 0) {
    throw new Error(`No items provided`);
  }

  const [$common, { bodyInserted, headingInserted }] = commonPanelStructure(
    $items
  );

  if (!bodyInserted) {
    console.warn("No body detected for panel");
  }
  if (!headingInserted) {
    console.warn("No heading detected for panel");
  }

  return outerHTML($common);
}

export function safeCssSelector(
  element: HTMLElement,
  selectors: css_selector_type[] = [],
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

function containerChildren(
  $container: JQuery<HTMLElement>,
  selected: HTMLElement[]
): HTMLElement[] {
  return selected.map((element) => {
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
}

export function inferSinglePanelHTML(
  container: HTMLElement,
  selected: HTMLElement
): string {
  const $container = $(container);
  const child = containerChildren($container, [selected])[0];
  const [$panel] = buildSinglePanelElement(child);
  return outerHTML($panel);
}

export function inferPanelHTML(
  container: HTMLElement,
  selected: HTMLElement[]
): string {
  const $container = $(container);

  if (selected.length > 1) {
    const children = containerChildren($container, selected);
    return commonPanelHTML(selected[0].tagName, $(children));
  }
  return inferSinglePanelHTML(container, selected[0]);
}

export function inferButtonHTML(
  container: HTMLElement,
  selected: HTMLElement[]
): string {
  const $container = $(container);

  if (selected.length > 1) {
    const children = containerChildren($container, selected);
    return commonButtonHTML(selected[0].tagName, $(children));
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
      return commonButtonHTML(tag, $items);
    }
  }

  throw new Error(
    `Did not find any button-like tags in container ${container.tagName}`
  );
}
