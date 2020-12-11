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

import castArray from "lodash/castArray";
import "jquery.initialize";

export const EXTENSION_POINT_DATA_ATTR = "data-pixiebrix-extension-point";

export function isHost(hostname: string): boolean {
  return (
    window.location.hostname === hostname ||
    window.location.hostname.endsWith(`.${hostname}`)
  );
}

function getAncestors(node: Node): Node[] {
  const ancestors = [node];
  let currentNode: Node = node;
  while (currentNode && currentNode != document) {
    ancestors.push(currentNode);
    currentNode = currentNode.parentNode;
  }
  return ancestors;
}

export function onNodeRemoved(node: Node, callback: () => void): void {
  const ancestors = getAncestors(node);

  const nodes = new WeakSet<Node>(ancestors);
  const observers = new Set<MutationObserver>();

  // Observe the whole path to the node. A node is removed if any of its ancestors are removed. Observe individual
  // nodes instead of the subtree on the document for efficiency on wide trees
  for (const ancestor of ancestors) {
    if (ancestor && ancestor.parentNode) {
      // https://stackoverflow.com/a/50397148/
      const removalObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          // https://stackoverflow.com/questions/51723962/typescript-nodelistofelement-is-not-an-array-type-or-a-string-type
          for (const removedNode of (mutation.removedNodes as any) as Iterable<Node>) {
            if (nodes.has(removedNode)) {
              try {
                for (const observer of observers) {
                  observer.disconnect();
                }
              } finally {
                callback();
              }
              break;
            }
          }
        }
      });
      removalObserver.observe(ancestor.parentNode, { childList: true });
    }
  }
}

/**
 * Returns true if the browser natively supports the CSS selector
 */
function isNativeCssSelector(selector: string): boolean {
  try {
    document.querySelector(selector);
    return true;
  } catch (err) {
    return false;
  }
}

function pollSelector(
  selector: string,
  target: HTMLElement | Document
): Promise<JQuery<HTMLElement>> {
  console.debug(`Polling for selector ${selector}`);
  const $target = $(target);
  return new Promise((resolve) => {
    function check() {
      const $result = $target.find(selector);
      if ($result.length) {
        resolve($result);
      }
      window.requestAnimationFrame(check);
    }
    check();
  });
}

function mutationSelector(
  selector: string,
  target?: HTMLElement | Document
): Promise<JQuery<HTMLElement>> {
  return new Promise((resolve) => {
    // @ts-ignore: no type signatures
    $.initialize(
      selector,
      function () {
        resolve($(this));
      },
      { target: target ?? document }
    );
  });
}

async function _initialize(
  selector: string,
  target: HTMLElement | Document
): Promise<JQuery<HTMLElement | Document>> {
  if (isNativeCssSelector(selector)) {
    return await mutationSelector(selector, target);
  } else {
    return await pollSelector(selector, target);
  }
}

/**
 * Recursively await an element using one or more JQuery selectors.
 * @param selector
 * @param rootElement
 */
export async function awaitElementOnce(
  selector: string | string[],
  rootElement: JQuery<HTMLElement | Document> = undefined
): Promise<JQuery<HTMLElement | Document>> {
  if (selector == null) {
    throw new Error("Expected selector");
  }

  const selectors = castArray(selector);
  const $root = rootElement ? $(rootElement) : $(document);

  if (!selectors.length) {
    return $root;
  }

  console.debug("Awaiting selectors", selectors);

  const [nextSelector, ...rest] = selectors;

  // find immediately, or wait for it to be initialized
  let $nextElement: JQuery<HTMLElement | Document> = $root.find(nextSelector);

  if (!$nextElement.length) {
    console.debug(
      `Selector ${nextSelector} not immediately found. Awaiting element`
    );
    $nextElement = await _initialize(nextSelector, $root.get(0));
  } else if (rest.length === 0) {
    return $nextElement;
  }

  return await awaitElementOnce(rest, $nextElement);
}

/**
 * Marks extensionPointId as owning a DOM element.
 * @param $element the JQuery selector
 * @param extensionPointId the owner extension ID
 * @param onRemove callback to call when the element is removed from the DOM
 */
export function acquireElement(
  $element: JQuery,
  extensionPointId: string,
  onRemove: () => void
): boolean {
  if ($element.length === 0) {
    console.debug(`acquireElement: no elements found for ${extensionPointId}`);
    return false;
  } else if ($element.length > 1) {
    console.warn(
      `acquireElement: multiple elements found for ${extensionPointId}`
    );
    return false;
  } else if ($element.attr(EXTENSION_POINT_DATA_ATTR)) {
    const existing = $element.attr(EXTENSION_POINT_DATA_ATTR);
    if (extensionPointId !== existing) {
      console.warn(
        `acquireElement: cannot acquire for ${extensionPointId} because has extension point ${existing} attached to it`
      );
      return false;
    }
    console.debug(
      `acquireElement: re-acquiring element for ${extensionPointId}`
    );
  }
  $element.attr(EXTENSION_POINT_DATA_ATTR, extensionPointId);
  onNodeRemoved($element.get(0), onRemove);
  return true;
}
