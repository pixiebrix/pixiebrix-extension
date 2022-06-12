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

import { castArray, noop, once, stubFalse } from "lodash";
import initialize from "@/vendors/initialize";
import { IExtension, MessageContext, ResolvedExtension } from "@/core";
import { $safeFind } from "@/helpers";
import { EXTENSION_POINT_DATA_ATTR } from "@/common";
import { JsonObject } from "type-fest";
import { ensureJsonObject, isObject } from "@/utils";
import { BusinessError } from "@/errors/businessErrors";
import selectionController from "@/utils/selectionController";

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
 * Recursively await an element using one or more jQuery selectors.
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
  // Safe to pass rootElement to $ constructor since it's already a jQuery object
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

/**
 * Returns the MessageContext associated with `extension`.
 */
export function selectExtensionContext(
  extension: ResolvedExtension
): MessageContext {
  return {
    // The step label will be re-assigned later in reducePipeline
    label: extension.label,
    extensionLabel: extension.label,
    extensionId: extension.id,
    extensionPointId: extension.extensionPointId,
    deploymentId: extension._deployment?.id,
    blueprintId: extension._recipe?.id,
    blueprintVersion: extension._recipe?.version,
  };
}

export function pickEventProperties(nativeEvent: Event): JsonObject {
  if (nativeEvent instanceof KeyboardEvent) {
    // Can't use Object.entries because they're on the prototype. Can't use lodash's pick because the type isn't
    // precise enough (per-picked property) to support the JsonObject return type.
    const { key, keyCode, metaKey, altKey, shiftKey, ctrlKey } = nativeEvent;

    return {
      key,
      keyCode,
      metaKey,
      altKey,
      shiftKey,
      ctrlKey,
    };
  }

  if (nativeEvent instanceof CustomEvent) {
    const { detail = {} } = nativeEvent;

    if (isObject(detail)) {
      // Ensure detail is a serialized/a JSON object. The custom trigger can also pick up JS custom event, which could
      // have real JS data in them (vs. a JsonObject the user has provided via our @pixiebrix/event brick)
      return ensureJsonObject(detail);
    }

    throw new BusinessError("Custom event detail is not an object");
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  if (nativeEvent.type === "selectionchange") {
    // https://developer.mozilla.org/en-US/docs/Web/API/Selection
    return {
      // Match the behavior for contextMenu and quickBar
      selectionText: selectionController.get(),
    };
  }

  return {};
}

export function makeShouldRunExtensionForStateChange(
  event: Event
): (extension: IExtension) => boolean {
  if (event instanceof CustomEvent) {
    const { detail } = event;

    // Ignore state changes from shared state and unrelated extensions/blueprints
    return (extension: IExtension) =>
      detail?.extensionId === extension.id ||
      (extension._recipe?.id != null &&
        extension._recipe?.id === detail?.blueprintId);
  }

  return stubFalse;
}
