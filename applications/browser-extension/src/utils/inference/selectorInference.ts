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

import { compact, identity, intersection, sortBy, uniq } from "lodash";
import { getCssSelector } from "css-selector-generator";
import type {
  CssSelectorMatch,
  CssSelectorType,
} from "css-selector-generator/types/types.js";
import { EXTENSION_POINT_DATA_ATTR, PIXIEBRIX_DATA_ATTR } from "../../domConstants";
import { guessUsefulness } from "../detectRandomString";
import {
  getSiteSelectorHint,
  SELECTOR_HINTS,
  type SiteSelectorHint,
} from "./siteSelectorHints";
import { escapeSingleQuotes, matchesAnyPattern } from "../stringUtils";
import { $safeFind } from "../domUtils";
import { type ElementInfo } from "./selectorTypes";
import { getAttributeSelectorRegex } from "./selectorInferenceUtils";
import { type Nullishable, assertNotNullish } from "../nullishUtils";

/** Valid selector that never returns any element (no `<selectnothing>` element exists) */
const NON_EXISTENT_TAG_NAME = "selectnothing";
export const BUTTON_TAGS: string[] = [
  "li",
  "button",
  "a",
  "span",
  "input",
  "svg",
];

const MENU_TAGS = ["ul", "tbody"];

export const UNIQUE_ATTRIBUTES: string[] = [
  "id",
  "name",
  "role",

  // Data attributes people use in automated tests are unlikely to change frequently
  "data-cy", // Cypress
  "data-testid",
  "data-id",
  "data-test",
  "data-test-id",

  // Register UNIQUE_ATTRIBUTES from all hints because we can't check site rules in this usage.
  ...SELECTOR_HINTS.flatMap((hint) => hint.uniqueAttributes),
];

// eslint-disable-next-line security/detect-non-literal-regexp -- Not user-provided
const UNIQUE_ATTRIBUTES_REGEX = new RegExp(
  UNIQUE_ATTRIBUTES.map((attribute) => `^\\[${attribute}=`).join("|"),
);

const UNIQUE_ATTRIBUTES_SELECTOR = UNIQUE_ATTRIBUTES.map(
  (attribute) => `[${attribute}]`,
).join(",");

const UNSTABLE_SELECTORS = [
  // Emberjs component tracking
  /#ember/,

  // Vuejs component tracking
  /^\[data-v-/,

  getAttributeSelectorRegex(
    // Our attributes
    EXTENSION_POINT_DATA_ATTR,
    PIXIEBRIX_DATA_ATTR,
    "style",
  ),
];

function getUniqueAttributeSelectors(
  element: HTMLElement,
  siteSelectorHint: SiteSelectorHint,
): string[] {
  return UNIQUE_ATTRIBUTES.map((attribute) =>
    getAttributeSelector(attribute, element.getAttribute(attribute)),
  )
    .filter(Boolean)
    .filter(
      (selector) =>
        !matchesAnyPattern(selector, [
          ...UNSTABLE_SELECTORS,
          // We need to include salesforce BAD_PATTERNS here as well since this function is used to get inferSelectorsIncludingStableAncestors
          ...siteSelectorHint.badPatterns,
        ]),
    );
}

/**
 * Convert classname of element to meaningful selector
 */
function getSelectorFromClass(className: string): string {
  const classHelper = document.createElement("i");
  classHelper.className = className;
  return "." + [...classHelper.classList].join(".");
}

/**
 * Return true if a selector is likely to uniquely identify an element.
 */
function isSelectorUsuallyUnique(selector: string): boolean {
  return selector.startsWith("#") || UNIQUE_ATTRIBUTES_REGEX.test(selector);
}

/**
 * Return selectors sorted by quality
 * - getSelectorPreference
 * - textual length (lower is better)
 * @param selectors an array of selectors, or items with selector properties to sort
 * @param iteratee a method to select the selector field for an item
 *
 * @see getSelectorPreference
 */
export function sortBySelector(selectors: string[]): string[];
export function sortBySelector<Item>(
  selectors: Item[],
  iteratee: (selector: Item) => string,
): Item[];
export function sortBySelector<Item = string>(
  selectors: Item[],
  iteratee: (selector: Item) => string = identity,
): Item[] {
  return sortBy(
    selectors,
    (x) => getSelectorPreference(iteratee(x)),
    (x) => iteratee(x).length,
  );
}

/**
 * Prefers unique selectors and classes. A lower number means higher preference.
 *
 * Do not call directly. Instead, call sortBySelector
 *
 * @example
 * -4  '#best-link-on-the-page'
 * -3  "[data-cy='b4da55']"
 * -2  '.iAmAUniqueGreatClassSelector' // it's rare case but happens when classname is unique
 * -1  '#parentId a' // tag name followed by parent unique Selector
 * -1  '[data-test-id='b4da55'] input' // tag name preceded by parent unique Selector
 *  0  '.navItem'
 *  0  '.birdsArentReal'
 *  1  'a'
 *
 * @see sortBySelector
 * @internal
 */
export function getSelectorPreference(selector: string): number {
  const tokenized = $.find.tokenize(selector);
  if (tokenized.length !== 1) {
    throw new TypeError(
      "Expected single selector, received selector list: " + selector,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Just checked
  const tokenCount = tokenized[0]!.length;

  if (selector.includes(":nth-child")) {
    // Structural selectors are fragile to page changes, so give low score
    return 2;
  }

  // Unique ID selectors can only be simple. When composed, ID selectors are always followed by non-unique parts
  if (selector.startsWith("#") && tokenCount === 1) {
    return -4;
  }

  if (isSelectorUsuallyUnique(selector)) {
    if (tokenCount === 1) {
      return -3;
    }

    return -1;
  }

  if (selector.startsWith(".") && tokenCount === 1) {
    return -2;
  }

  if (selector.startsWith(".")) {
    return 0;
  }

  return 1;
}

const DEFAULT_SELECTOR_PRIORITIES: CssSelectorType[] = [
  "id",
  "tag",
  "class",
  "attribute",
  "nthoftype",
  "nthchild",
];

interface SafeCssSelectorOptions {
  selectors?: CssSelectorType[];
  root?: Element | null;
  excludeRandomClasses?: boolean;
  allowMultiSelection?: boolean;
}

/**
 * Calls getCssSelector with smarter handling of undefined root element and blacklisting common
 * front-end framework elements that aren't good for selectors
 */
export function safeCssSelector(
  elements: HTMLElement[],
  {
    selectors = DEFAULT_SELECTOR_PRIORITIES,
    excludeRandomClasses = false,
    root = undefined,
  }: SafeCssSelectorOptions = {},
): string {
  // https://github.com/fczbkk/css-selector-generator
  const firstElement = elements[0];
  if (!firstElement) {
    return NON_EXISTENT_TAG_NAME;
  }

  const siteSelectorHint = getSiteSelectorHint(firstElement);

  const blacklist = [...UNSTABLE_SELECTORS, ...siteSelectorHint.badPatterns];
  if (excludeRandomClasses) {
    blacklist.push((selector: string) => {
      if (!selector.startsWith(".")) {
        return false;
      }

      const usefulness = guessUsefulness(selector);
      console.debug("css-selector-generator:  ", usefulness);
      return usefulness.isRandom;
    });
  }

  const whitelist = [
    getAttributeSelectorRegex(...UNIQUE_ATTRIBUTES),
    ...siteSelectorHint.stableAnchors,
  ];

  const selector = getCssSelector(elements, {
    blacklist,
    whitelist,
    selectors,
    combineWithinSelector: true,
    combineBetweenSelectors: true,
    root,
  });

  if (root == null && selector.startsWith(":nth-child")) {
    // JQuery will happily return other matches that match the nth-child chain, so make attach it to the body
    // to get the expected CSS selector behavior
    return `body${selector}`;
  }

  return selector;
}

/**
 * Returns true if selectors match any of the same elements.
 */
function selectorsOverlap(
  lhs: string,
  rhs: string,
  root?: HTMLElement,
): boolean {
  return (
    intersection($safeFind(lhs, root).get(), $safeFind(rhs, root).get())
      .length > 0
  );
}

/**
 * Heuristically infer selector for elements and similar elements on the page.
 *
 * The generated selector will match at least all the user-selected `elements`.
 *
 * Used by the "expand selection" feature in the Selection Tool.
 *
 * @param elements user-selected elements
 * @param selectors list of selector types to use, in order of preference
 * @param excludeRandomClasses true to heuristically excluded random classnames
 * @param root the root to generate selectors relative to
 */
export function expandedCssSelector(
  elements: HTMLElement[],
  {
    selectors = DEFAULT_SELECTOR_PRIORITIES,
    excludeRandomClasses = false,
    root = null,
  }: SafeCssSelectorOptions = {},
): string | undefined {
  // All elements are on the same page, so just use first element for siteSelectorHint
  // https://github.com/fczbkk/css-selector-generator
  const firstElement = elements[0];

  if (!firstElement) {
    return;
  }

  const siteSelectorHint = getSiteSelectorHint(firstElement);

  const blacklist: CssSelectorMatch[] = [
    ...UNSTABLE_SELECTORS,
    ...siteSelectorHint.badPatterns,
  ];
  if (excludeRandomClasses) {
    blacklist.push((selector: string) => {
      if (!selector.startsWith(".")) {
        return false;
      }

      const usefulness = guessUsefulness(selector);
      console.debug("css-selector-generator:  ", usefulness);
      return usefulness.isRandom;
    });
  }

  const whitelist = [
    getAttributeSelectorRegex(...UNIQUE_ATTRIBUTES),
    ...siteSelectorHint.stableAnchors,
    ...siteSelectorHint.requiredSelectors,
  ];

  // Find ancestors of each user-selected element. Unlike single-element select, includes both
  // unique attributes and classnames (classnames might not be stable).
  const elementAncestors = elements.map((element) =>
    $(element)
      .parentsUntil(root ?? undefined)
      .filter(
        [...UNIQUE_ATTRIBUTES, "class"]
          .map((attribute) => `[${attribute}]`)
          .join(","),
      )
      .get(),
  );

  // Get an arbitrary common ancestor. (Will likely be first element because parentsUntil works from the element upward)
  // Might not exist if the root doesn't have any of stable attributes/classname
  const [closestCommonAncestor] = intersection(...elementAncestors);

  if (!closestCommonAncestor) {
    return;
  }

  // Get selector of common ancestor
  const commonAncestorSelector = getCssSelector(closestCommonAncestor, {
    blacklist,
    whitelist: ["class", "tag", ...whitelist],
    selectors,
    combineWithinSelector: true,
    combineBetweenSelectors: true,
    root,
  });

  // Get common attribute of parent of user selected elements. Will be used before to use the ">" immediate descendant
  // operator for the elements.
  //
  // Using the parent or another level of ancestor is helpful for preventing over-matching on based on the user-selected
  // elements attribute/tag name selector.
  //
  // TODO: look for all common attributes that could be non-unique, e.g., aria-role="button"
  // TODO: right now this is picking an arbitrary class name
  const [commonParentClassName] = intersection(
    ...elements.map((element) => [$(element).parent().attr("class")]),
  );

  const commonSelector =
    commonAncestorSelector &&
    commonParentClassName &&
    !selectorsOverlap(
      commonAncestorSelector,
      getSelectorFromClass(commonParentClassName),
    )
      ? [
          commonAncestorSelector,
          getSelectorFromClass(commonParentClassName),
          ">",
        ].join(" ")
      : commonAncestorSelector;

  // Get common attributes of user-selected elements
  // TODO: look for all common attribute values that would be non-unique: e.g., aria-role="button"
  // TODO: right now this is picking an arbitrary class name
  const [commonElementClassName] = intersection(
    ...elements.map((element) => element.className.split(" ")),
  );

  if (commonElementClassName) {
    return [commonSelector, getSelectorFromClass(commonElementClassName)].join(
      " ",
    );
  }

  // Union of all tag types for the selected elements
  // For example: #root a, #root span
  return uniq(elements.map((element) => element.tagName))
    .map((tagName) => [commonSelector, tagName.toLowerCase()].join(" "))
    .join(", ");
}

function findAncestorsWithIdLikeSelectors(
  element: HTMLElement,
  root?: Element,
): HTMLElement[] {
  // eslint-disable-next-line unicorn/no-array-callback-reference -- jQuery false positive
  return $(element).parentsUntil(root).filter(UNIQUE_ATTRIBUTES_SELECTOR).get();
}

export function inferSelectorsIncludingStableAncestors(
  element: HTMLElement,
  root?: Element,
  excludeRandomClasses?: boolean,
): string[] {
  const siteSelectorHint = getSiteSelectorHint(element);
  const stableAncestors = findAncestorsWithIdLikeSelectors(
    element,
    root,
  ).flatMap((stableAncestor) =>
    inferSelectors(element, stableAncestor, excludeRandomClasses).flatMap(
      (selector) =>
        getUniqueAttributeSelectors(stableAncestor, siteSelectorHint)
          .filter(Boolean)
          .map((stableAttributeSelector) =>
            [stableAttributeSelector, selector].join(" "),
          ),
    ),
  );

  return sortBySelector(
    compact(
      uniq([
        ...inferSelectors(element, root, excludeRandomClasses),
        ...stableAncestors,
      ]),
    ),
  );
}

/**
 * Generate some CSS selector variants for an element.
 * @internal
 */
export function inferSelectors(
  element: HTMLElement,
  root?: Element,
  excludeRandomClasses?: boolean,
): string[] {
  const makeSelector = (allowed?: CssSelectorType[]) => {
    try {
      return safeCssSelector([element], {
        selectors: allowed,
        root,
        excludeRandomClasses,
      });
    } catch (error) {
      console.warn("Selector inference failed", {
        element,
        allowed,
        root,
        error,
      });
    }
  };

  return sortBySelector(
    compact(
      uniq([
        makeSelector(["id", "class", "tag", "attribute", "nthchild"]),
        makeSelector(["tag", "class", "attribute", "nthchild"]),
        makeSelector(["id", "tag", "attribute", "nthchild"]),
        makeSelector(["id", "tag", "attribute"]),
        makeSelector(["class", "tag", "attribute"]),
        makeSelector(),
      ]),
    ),
  );
}

export type InferSelectorArgs = {
  /**
   * The root to generate the selector with respect to.
   */
  root: HTMLElement | null;
  /**
   * True to exclude class names that appear to be randomly generated.
   */
  excludeRandomClasses: boolean;
};

/**
 * Infer a selector that matches multiple elements.
 * @param elements the example elements
 * @param root the root element, or null to generate with respect to the document
 * @param excludeRandomClasses true to attempt to exclude random classes, e.g. CSS module hashes
 * @param shouldSelectSimilar true to expand the selector to match similar elements
 * @see inferSingleElementSelector
 */
export function inferMultiElementSelector({
  elements,
  root,
  excludeRandomClasses,
  shouldSelectSimilar,
}: InferSelectorArgs & {
  elements: HTMLElement[];
  shouldSelectSimilar?: boolean;
}): ElementInfo {
  const firstElement = elements[0];
  if (!firstElement) {
    return {
      selectors: [NON_EXISTENT_TAG_NAME],
      tagName: NON_EXISTENT_TAG_NAME,
      parent: null,
      isMulti: true,
    };
  }

  const selector = shouldSelectSimilar
    ? expandedCssSelector(elements, {
        root,
        excludeRandomClasses,
      })
    : safeCssSelector(elements, {
        root,
        excludeRandomClasses,
      });

  const inferredSelectors = uniq([
    selector,
    // TODO: Discuss if it's worth to include stableAncestors for multi-element selector
    // ...inferSelectorsIncludingStableAncestors(elements[0]),
  ]).filter(Boolean);

  return {
    selectors: inferredSelectors,
    tagName: firstElement.tagName, // Will first element tag be enough/same for all elements?
    parent: null,
    isMulti: true,
  };
}

/**
 * Returns true if selector uniquely identifies a single element on the page.
 */
export function doesSelectOneElement(
  selector: string,
  parent?: HTMLElement | Document | JQuery<HTMLElement | Document>,
): boolean {
  return $safeFind(selector, parent).length === 1;
}

export function getCommonAncestor(...args: HTMLElement[]): HTMLElement | null {
  if (args.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Just checked
    return args[0]!.parentElement!;
  }

  const [node, ...otherNodes] = args;

  let currentNode: Nullishable<HTMLElement> = node;

  while (currentNode) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func, @typescript-eslint/no-non-null-assertion -- Called immediately
    if (otherNodes.every((x) => currentNode!.contains(x))) {
      return currentNode;
    }

    currentNode = currentNode?.parentElement;
  }

  return null;
}

function findContainerForElement(element: HTMLElement): {
  container: HTMLElement;
  selectors: string[];
} {
  /* eslint-disable @typescript-eslint/no-non-null-assertion --
   We assume that the checked elements are not `html` and are attached to the page, so they all have a parentElement */
  let container: HTMLElement = element;
  let level = 0;

  if (BUTTON_TAGS.includes(element.tagName.toLowerCase())) {
    container = element.parentElement!;
    level++;
  }

  /**
   * If the direct parent is a list item or column, that's most li
   */
  if (MENU_TAGS.includes(container.parentElement!.tagName.toLowerCase())) {
    container = container.parentElement!;
    level++;
  }
  /* eslint-enable @typescript-eslint/no-non-null-assertion  */

  const extra: string[] = [];

  if (container !== element) {
    const descendent = level === 1 ? ">" : "> * >";

    if (element.tagName === "INPUT") {
      extra.push(
        `${container.tagName.toLowerCase()}:has(${descendent} input[value='${escapeSingleQuotes(
          element.getAttribute("value") ?? "",
        )}'])`,
      );
    } else {
      extra.push(
        `${container.tagName.toLowerCase()}:has(${descendent} ${element.tagName.toLowerCase()}:contains('${escapeSingleQuotes(
          $(element).text().trim(),
        )}'))`,
      );
    }
  }

  return {
    container,
    selectors: uniq([
      ...extra.filter((selector) => doesSelectOneElement(selector)),
      ...inferSelectors(container),
    ]),
  };
}

export function findContainer(elements: HTMLElement[]): {
  container: HTMLElement;
  selectors: string[];
} {
  const firstElement = elements[0];
  assertNotNullish(firstElement, "No element was selected");

  if (elements.length > 1) {
    const container = getCommonAncestor(...elements);
    if (!container) {
      throw new Error("Selected elements have no common ancestors");
    }

    return {
      container,
      selectors: inferSelectors(container),
    };
  }

  return findContainerForElement(firstElement);
}

/**
 * @param name Like "id", "data-test"
 * @param value Like "main-nav", "user-sidebar"
 * @returns Like "#main-nav", "[data-test='user-sidebar']"
 * @internal
 */
export function getAttributeSelector(
  name: string,
  value: string | null,
): string | undefined {
  if (!value) {
    return;
  }

  // Must be specified here or else the next condition creates `[id='something']`
  if (name === "id") {
    return "#" + CSS.escape(value);
  }

  if (
    name === "title" ||
    name.startsWith("aria-") ||
    UNIQUE_ATTRIBUTES.includes(name)
  ) {
    //  Must use single quotes to match `css-selector-generator`
    return `[${name}='${CSS.escape(value)}']`;
  }
}
