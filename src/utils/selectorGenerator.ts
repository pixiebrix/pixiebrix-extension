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

import { UNIQUE_ATTRIBUTES } from "@/contentScript/nativeEditor/infer";
import { compact } from "lodash";
import { isRandomString } from "./detectRandomString";

/**
 * @param name   Like "id", "data-test"
 * @param value  Like "main-nav", "user-sidebar"
 * @return  Like "#main-nav", "[data-test='user-sidebar']"
 */
export function getAttributeSelector(
  name: string,
  value: string | null
): string | null {
  if (!value) {
    return;
  }

  // Must be specified here or else the next condition creates `[id="something"]
  // Exclude emberjs component tracking.
  // NOTE: if you add an id pre-fix here, you should also add it to infer.ts:safeCssSelector's denylist
  if (name === "id" && !value.startsWith("ember")) {
    return "#" + value;
  }

  if (
    name === "title" ||
    name.startsWith("aria-") ||
    UNIQUE_ATTRIBUTES.includes(name)
  ) {
    return `[${name}="${value}"]`;
  }
}

function getClassSelector(className: string): string | null {
  if (!isRandomString(className)) {
    return "." + className;
  }
}

/**
 * Get an array of "simple selectors" for the target element
 * https://www.w3.org/TR/selectors-4/#grammar
 * @example ["h1", ".bold", ".italic", "[aria-label=Title]"]
 */
function getElementSelectors(target: Element): string[] {
  const attributeSelectors = [...target.attributes].map(({ name, value }) =>
    getAttributeSelector(name, value)
  );
  const classSelectors = [...target.classList].map((className) =>
    getClassSelector(className)
  );

  return compact([
    ...attributeSelectors,
    ...classSelectors,
    target.tagName.toLowerCase(),
  ]);
}

/**
 * Get a single "compound selector" for the target element
 * https://www.w3.org/TR/selectors-4/#grammar
 * @example "h1.bold.italic[aria-label=Title]"
 */
function getElementSelector(target: Element): string {
  return getElementSelectors(target).join("");
}

/**
 * Get an array of unfiltered selectors for each parent of the target
 *
 * @example ["main", "div", "div.content", "p[title='Your project']", "span.title"]
 */
function getSelectorTree(target: HTMLElement): string[] {
  return $(target)
    .parentsUntil("body")
    .addBack()
    .get()
    .map((ancestor) => getElementSelector(ancestor));
}

/**
 * Generate a selector for the target element
 *
 * @example "main div.content > p[title='Your project'] > span.title"
 */
export default function generateSelector(target: HTMLElement): string {
  // Merge tree, but
  return (
    getSelectorTree(target)
      .join(" > ")
      // Avoid bland selectors
      .replace(/^(div > )+/, "")
      .replaceAll(" > div > ", " ")
  );
}
