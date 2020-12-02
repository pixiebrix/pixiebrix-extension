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

import { uniq } from "lodash";
const BUTTON_TAGS = ["li", "button", "td", "a", "input"];
const MULTI_ATTRS = ["class", "rel"];

// @ts-ignore: no types available
import getCssSelector from "css-selector-generator";

export const DEFAULT_ACTION_CAPTION = "Action";

function commonAttr($items: JQuery<HTMLElement>, attr: string) {
  const values = $items
    .toArray()
    .map((x) => x.attributes.getNamedItem(attr)?.value);
  // For classes we take the common classes
  if (MULTI_ATTRS.includes(attr)) {
    const classNames = values.map((x) => new Set(x ? x.split(" ") : []));
    const commonValues = classNames.reduce((acc, other) => {
      return acc == null
        ? other
        : new Set([...acc].filter((x) => other.has(x)));
    }, null);
    return commonValues.size > 0
      ? Array.from(commonValues.values()).join(" ")
      : null;
  } else if (uniq(values).length === 1) {
    return values[0];
  }
  return null;
}

function commonHTML(tag: string, $items: JQuery<HTMLElement>): string {
  const $common = $(`<${tag}>`);

  const attributes = $items.get(0).attributes;

  // Find the common attributes between the elements
  for (const attrIndex in Object.keys(attributes)) {
    const attrName = attributes[attrIndex].name;
    console.log(attrName);

    const value = commonAttr($items, attrName);
    if (value != null) {
      $common.attr(attrName, value);
    }
  }

  if (tag === "a") {
    $common.attr("href", "#");
  }

  $common.text("{{{ caption }}}");

  return $("<div>").append($common.clone()).html();
}

// https://gist.github.com/getify/3667624
function escapeDoubleQuotes(str: string): string {
  return str.replace(/\\([\s\S])|(")/g, "\\$1$2"); // thanks @slevithan!
}

export function findContainer(
  element: HTMLElement
): { container: HTMLElement; selectors: string[] } {
  let container;

  if (BUTTON_TAGS.includes(element.tagName.toLowerCase())) {
    container = element.parentElement;
  } else {
    container = element;
  }

  const extra: string[] = [];

  if (container !== element) {
    if (element.tagName === "INPUT") {
      extra.push(
        `${container.tagName.toLowerCase()}:has(> input[value="${escapeDoubleQuotes(
          element.getAttribute("value")
        )}"])`
      );
    } else {
      extra.push(
        `${container.tagName.toLowerCase()}:has(> ${element.tagName.toLowerCase()}:contains("${escapeDoubleQuotes(
          $(element).text().trim()
        )}"))`
      );
    }
  }

  return {
    container,
    selectors: uniq([
      ...extra,
      getCssSelector(container),
      getCssSelector(container, { selectors: ["tag"] }),
      getCssSelector(container, { selectors: ["class", "tag"] }),
      getCssSelector(container, { selectors: ["tag", "class"] }),
    ]),
  };
}

export function inferButtonHTML(container: HTMLElement): string {
  const $container = $(container);

  for (const tag of BUTTON_TAGS) {
    const $items = $container.children(tag);

    if ($items.length) {
      if (tag === "input") {
        const value = commonAttr($items, "type");
        return `<input type="${value ?? "button"}" value="{{{ caption }}}" />`;
      }
      return commonHTML(tag, $items);
    }
  }

  throw new Error(
    `Did not find any button-like tags in container ${container.tagName}`
  );
}
