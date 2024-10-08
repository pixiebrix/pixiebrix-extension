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

import { castArray } from "lodash";
import initialize from "@/vendors/jQueryInitialize";
import { EXTENSION_POINT_DATA_ATTR } from "@/domConstants";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { $safeFind } from "@/utils/domUtils";
import { onAbort } from "abort-utils";

import { isStateChangeEvent } from "@/platform/state/stateTypes";

/**
 * Attach a callback to be called when a node is removed from the DOM
 * @param node the DOM node to observe
 * @param callback callback to call when the node is removed
 */
export function onNodeRemoved(
  element: Element,
  callback: () => void,
  signal?: AbortSignal,
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

async function mutationSelector(
  selector: string,
  signal?: AbortSignal,
  target?: HTMLElement | Document,
): Promise<JQuery | null> {
  let observer: MutationObserver;
  return new Promise<JQuery | null>((resolve) => {
    observer = initialize(
      selector,
      (i: number, element: HTMLElement) => {
        resolve($(element));
      },
      { target: target ?? document },
    );
    onAbort(signal, observer, () => {
      resolve(null);
    });
  });
}

/**
 * Recursively await an element using one or more jQuery selectors.
 * @param selector selector, or an array of selectors to
 * @param $root the root element, defaults to `document`
 * @returns The element found or undefined if the signal was aborted
 */
export async function awaitElementOnce(
  selector: string | readonly string[],
  signal?: AbortSignal,
  $root: JQuery<HTMLElement | Document> = $(document),
): Promise<JQuery<HTMLElement | Document>> {
  if (selector == null) {
    throw new Error("awaitElementOnce expected selector");
  }

  // Clone the array so we don't mutate the original if selector is already an array
  const selectors = [...castArray(selector)];

  const nextSelector = selectors.shift();

  if (!nextSelector) {
    return $root;
  }

  // Find immediately, or wait for it to be initialized
  const $elements: JQuery<HTMLElement | Document> = $safeFind(
    nextSelector,
    $root,
  );

  if ($elements.length === 0) {
    console.debug(
      `awaitElementOnce: selector not immediately found; awaiting selector: ${nextSelector}`,
    );

    signal?.addEventListener("abort", () => {
      console.debug(
        `awaitElementOnce: caller cancelled wait for selector: ${nextSelector}`,
      );
    });

    const $nextElement = await mutationSelector(
      nextSelector,
      signal,
      $root.get(0),
    );

    if (!$nextElement) {
      return $root;
    }

    console.debug(`awaitElementOnce: found selector: ${nextSelector}`);

    return awaitElementOnce(selectors, signal, $nextElement);
  }

  if (selectors.length === 0) {
    return $elements;
  }

  return awaitElementOnce(selectors, signal, $elements);
}

/**
 * Marks extensionPointId as owning a DOM element and returns a callback that notifies if the element is removed
 * from the DOM
 * @param element the element to acquire
 * @param extensionPointId the owner extension ID
 * @returns true if the element was successfully acquired, false if it was already acquired by another extension point
 */
export function acquireElement(
  element: HTMLElement,
  extensionPointId: string,
): boolean {
  const existing = element.getAttribute(EXTENSION_POINT_DATA_ATTR);
  if (existing) {
    if (extensionPointId !== existing) {
      console.warn(
        `acquireElement: cannot acquire for ${extensionPointId} because it has extension point ${existing} attached to it`,
      );
      return false;
    }

    console.debug(
      `acquireElement: re-acquiring element for ${extensionPointId}`,
    );
  }

  element.setAttribute(EXTENSION_POINT_DATA_ATTR, extensionPointId);
  return true;
}

/**
 * Returns true if the ModComponent should run for the given state change event.
 */
export function shouldModComponentRunForStateChange(
  modComponent: ModComponentBase,
  event: Event,
): boolean {
  if (isStateChangeEvent(event)) {
    const { detail } = event;

    // Ignore state changes from shared state and unrelated mods/mod components
    return (
      detail?.extensionId === modComponent.id ||
      modComponent.modMetadata.id === detail?.blueprintId
    );
  }

  return false;
}
