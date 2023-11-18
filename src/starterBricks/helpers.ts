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

import { castArray, noop } from "lodash";
import initialize from "@/vendors/initialize";
import { EXTENSION_POINT_DATA_ATTR } from "@/domConstants";
import {
  type ModComponentBase,
  type ResolvedModComponent,
} from "@/types/modComponentTypes";
import { type MessageContext } from "@/types/loggerTypes";
import { $safeFind } from "@/utils/domUtils";
import { onAbort } from "@/utils/promiseUtils";

/**
 * Attach a callback to be called when a node is removed from the DOM
 * @param node the DOM node to observe
 * @param callback callback to call when the node is removed
 */
export function onNodeRemoved(
  element: Element,
  callback: () => void,
  signal?: AbortSignal
): void {
  if (signal?.aborted) {
    return;
  }

  if (!element.parentElement) {
    callback();
    return;
  }

  // Ensure it's only ever called once
  let called = false;

  const observer = new MutationObserver(() => {
    if (!element.isConnected) {
      observer.disconnect();
      if (!called) {
        called = true;
        callback();
      }
    }
  });

  // Observe all the parents
  let cursor = element;
  while (cursor.parentElement) {
    cursor = cursor.parentElement;
    observer.observe(cursor, { childList: true });
  }

  if (signal) {
    onAbort(signal, observer);
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
 * Recursively await an element using one or more jQuery selectors.
 * @param selector selector, or an array of selectors to
 * @param $root the root element, defaults to `document`
 * @returns [promise, cancel] the element promise and a callback for cancelling the promise
 */
export function awaitElementOnce(
  selector: string | string[],
  $root: JQuery<HTMLElement | Document> = $(document)
): [Promise<JQuery<HTMLElement | Document>>, () => void] {
  if (selector == null) {
    throw new Error("awaitElementOnce expected selector");
  }

  // Clone the array so we don't mutate the original if selector is already an array
  const selectors = [...castArray(selector)];

  const nextSelector = selectors.shift();

  if (!nextSelector) {
    return [Promise.resolve($root), noop];
  }

  // Find immediately, or wait for it to be initialized
  const $elements: JQuery<HTMLElement | Document> = $safeFind(
    nextSelector,
    $root
  );

  if ($elements.length === 0) {
    console.debug(
      `awaitElementOnce: selector not immediately found; awaiting selector: ${nextSelector}`
    );

    const [nextElementPromise, cancel] = mutationSelector(
      nextSelector,
      $root.get(0)
    );
    let innerCancel = noop;
    return [
      // eslint-disable-next-line promise/prefer-await-to-then -- We can return it before it resolves
      nextElementPromise.then(async ($nextElement) => {
        const [innerPromise, inner] = awaitElementOnce(selectors, $nextElement);
        innerCancel = inner;

        console.debug(`awaitElementOnce: found selector: ${nextSelector}`);

        return innerPromise;
      }),
      () => {
        console.debug(
          `awaitElementOnce: caller cancelled wait for selector: ${nextSelector}`
        );
        cancel();
        innerCancel();
      },
    ];
  }

  if (selectors.length === 0) {
    return [Promise.resolve($elements), noop];
  }

  return awaitElementOnce(selectors, $elements);
}

/**
 * Marks extensionPointId as owning a DOM element and returns a callback that notifies if the element is removed
 * from the DOM
 * @param element the element to acquire
 * @param extensionPointId the owner extension ID
 * @return true if the element was successfully acquired, false if it was already acquired by another extension point
 */
export function acquireElement(
  element: HTMLElement,
  extensionPointId: string
): boolean {
  const existing = element.getAttribute(EXTENSION_POINT_DATA_ATTR);
  if (existing) {
    if (extensionPointId !== existing) {
      console.warn(
        `acquireElement: cannot acquire for ${extensionPointId} because it has extension point ${existing} attached to it`
      );
      return false;
    }

    console.debug(
      `acquireElement: re-acquiring element for ${extensionPointId}`
    );
  }

  element.setAttribute(EXTENSION_POINT_DATA_ATTR, extensionPointId);
  return true;
}

/**
 * Returns the MessageContext associated with `extension`.
 */
export function selectExtensionContext(
  extension: ResolvedModComponent
): MessageContext {
  return {
    // The step label will be re-assigned later in reducePipeline
    label: extension.label ?? undefined,
    extensionLabel: extension.label ?? undefined,
    extensionId: extension.id,
    extensionPointId: extension.extensionPointId,
    deploymentId: extension._deployment?.id,
    blueprintId: extension._recipe?.id,
    blueprintVersion: extension._recipe?.version,
  };
}

/**
 * Returns true if the ModComponent should run for the given state change event.
 */
export function shouldModComponentRunForStateChange(
  modComponent: ModComponentBase,
  event: Event
): boolean {
  if (event instanceof CustomEvent) {
    const { detail } = event;

    // Ignore state changes from shared state and unrelated extensions/blueprints
    return (
      detail?.extensionId === modComponent.id ||
      (modComponent._recipe?.id != null &&
        modComponent._recipe?.id === detail?.blueprintId)
    );
  }

  return false;
}
