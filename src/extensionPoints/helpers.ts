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

import { castArray, noop, once } from "lodash";
import initialize from "@/vendors/initialize";
import { MessageContext, ResolvedExtension } from "@/core";
import { $safeFind } from "@/helpers";
import { EXTENSION_POINT_DATA_ATTR } from "@/common";

export function isHost(hostname: string): boolean {
  return (
    window.location.hostname === hostname ||
    window.location.hostname.endsWith(`.${hostname}`)
  );
}

function getAncestors(node: Node): Node[] {
  const ancestors = [node];
  let currentNode: Node = node;
  while (currentNode && currentNode !== document) {
    ancestors.push(currentNode);
    currentNode = currentNode.parentNode;
  }

  return ancestors;
}

export function onNodeRemoved(node: Node, callback: () => void): () => void {
  const ancestors = getAncestors(node);

  const nodes = new WeakSet<Node>(ancestors);
  const observers = new Set<MutationObserver>();

  // Make sure we're only calling once
  const wrappedCallback = once(callback);

  // Observe the whole path to the node. A node is removed if any of its ancestors are removed. Observe individual
  // nodes instead of the subtree on the document for efficiency on wide trees
  for (const ancestor of ancestors) {
    if (!ancestor?.parentNode) {
      continue;
    }

    // https://stackoverflow.com/a/50397148/
    const removalObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // https://stackoverflow.com/questions/51723962/typescript-nodelistofelement-is-not-an-array-type-or-a-string-type
        for (const removedNode of mutation.removedNodes as any as Iterable<Node>) {
          if (!nodes.has(removedNode)) {
            continue;
          }

          for (const observer of observers) {
            try {
              observer.disconnect();
            } catch (error) {
              console.warn("Error disconnecting mutation observer", error);
            }
          }

          wrappedCallback();
          break;
        }
      }
    });
    removalObserver.observe(ancestor.parentNode, { childList: true });
  }

  return () => {
    for (const observer of observers) {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn("Error disconnecting mutation observer", error);
      }
    }

    observers.clear();
  };
}

/**
 * Returns true if the browser natively supports the CSS selector
 */
export function isNativeCssSelector(selector: string): boolean {
  try {
    document.body.matches(selector);
    return true;
  } catch {
    return false;
  }
}

function mutationSelector(
  selector: string,
  target?: HTMLElement | Document
): [Promise<JQuery>, () => void] {
  let observer: MutationObserver;
  const promise = new Promise<JQuery>((resolve) => {
    observer = initialize(
      selector,
      (i: number, element: HTMLElement) => {
        resolve($(element));
      },
      { target: target ?? document }
    );
  });
  return [
    promise,
    () => {
      observer.disconnect();
    },
  ];
}

/**
 * Recursively await an element using one or more JQuery selectors.
 * @param selector selector, or an array of selectors to
 * @param $rootElement the root element, defaults to `document`
 * @returns [promise, cancel] the element promise and a callback for cancelling the promise
 */
export function awaitElementOnce(
  selector: string | string[],
  $rootElement?: JQuery<HTMLElement | Document>
): [Promise<JQuery<HTMLElement | Document>>, () => void] {
  if (selector == null) {
    throw new Error("awaitElementOnce expected selector");
  }

  const selectors = castArray(selector);
  // Safe to pass rootElement to $ constructor since it's already a JQuery object
  const $root = $rootElement ? $($rootElement) : $(document);

  if (selectors.length === 0) {
    return [Promise.resolve($root), noop];
  }

  // Console.debug("Awaiting selectors", selectors);

  const [nextSelector, ...rest] = selectors;

  // Find immediately, or wait for it to be initialized
  const $element: JQuery<HTMLElement | Document> = $safeFind(
    nextSelector,
    $root
  );

  if ($element.length === 0) {
    console.debug(
      `Selector not immediately found; awaiting selector: ${nextSelector}`
    );

    const [nextElementPromise, cancel] = mutationSelector(
      nextSelector,
      $root.get(0)
    );
    let innerCancel = noop;
    return [
      // eslint-disable-next-line promise/prefer-await-to-then -- We can return it before it resolves
      nextElementPromise.then(async ($nextElement) => {
        const [innerPromise, inner] = awaitElementOnce(rest, $nextElement);
        innerCancel = inner;
        return innerPromise;
      }),
      () => {
        cancel();
        innerCancel();
      },
    ];
  }

  if (rest.length === 0) {
    return [Promise.resolve($element), noop];
  }

  return awaitElementOnce(rest, $element);
}

/**
 * Marks extensionPointId as owning a DOM element.
 * @param element the element to acquire
 * @param extensionPointId the owner extension ID
 * @param onRemove callback to call when the element is removed from the DOM
 */
export function acquireElement(
  element: HTMLElement,
  extensionPointId: string,
  onRemove: () => void
): () => void | null {
  const existing = element.getAttribute(EXTENSION_POINT_DATA_ATTR);
  if (existing) {
    if (extensionPointId !== existing) {
      console.warn(
        `acquireElement: cannot acquire for ${extensionPointId} because it has extension point ${existing} attached to it`
      );
      return null;
    }

    console.debug(
      `acquireElement: re-acquiring element for ${extensionPointId}`
    );
  }

  element.setAttribute(EXTENSION_POINT_DATA_ATTR, extensionPointId);
  return onNodeRemoved(element, onRemove);
}

export function selectExtensionContext(
  extension: ResolvedExtension
): MessageContext {
  return {
    label: extension.label,
    extensionId: extension.id,
    extensionPointId: extension.extensionPointId,
    deploymentId: extension._deployment?.id,
    blueprintId: extension._recipe?.id,
  };
}
