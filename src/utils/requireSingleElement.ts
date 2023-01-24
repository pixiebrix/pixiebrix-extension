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

import {
  BusinessError,
  MultipleElementsFoundError,
  NoElementsFoundError,
} from "@/errors/businessErrors";

/**
 * Returns exactly one HTMLElement corresponding to the given selector.
 * @param selector the jQuery selector
 * @param parent an optional parent element to search within
 * @throws NoElementsFoundError if not elements are found
 * @throws MultipleElementsFoundError if multiple elements are found
 */
export function findSingleElement<Element extends HTMLElement>(
  selector: string,
  parent: Document | HTMLElement | JQuery<HTMLElement | Document> = document
): Element {
  const $elements = $(parent).find<Element>(selector);
  return assertSingleElement($elements, selector);
}

/**
 * Returns exactly one HTMLElement from the JQuery collection.
 * @param $elements the JQuery collection
 * @param selector the jQuery selector that generated the collection
 * @throws NoElementsFoundError if not elements are found
 * @throws MultipleElementsFoundError if multiple elements are found
 */
export function assertSingleElement<Element extends HTMLElement>(
  $elements: JQuery<HTMLElement | Document>,
  selector?: string
): Element {
  if ($elements.length === 0) {
    throw new NoElementsFoundError(selector);
  }

  if ($elements.length > 1) {
    throw new MultipleElementsFoundError(selector);
  }

  const element = $elements.get(0);

  if (element === document) {
    throw new BusinessError("Expected an element, received the document");
  }

  return element as Element;
}
