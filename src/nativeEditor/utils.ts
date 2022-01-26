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

import jQuery from "jquery";
import { MultipleElementsFoundError, NoElementsFoundError } from "@/errors";

/**
 * Returns exactly one HTMLElement corresponding to the given selector.
 * @param selector the JQuery selector
 * @throws NoElementsFoundError if not elements are found
 * @throws MultipleElementsFoundError if multiple elements are found
 */
export function requireSingleElement(selector: string): HTMLElement {
  const $elt = jQuery(document).find(selector);
  if ($elt.length === 0) {
    throw new NoElementsFoundError(selector);
  }

  if ($elt.length > 1) {
    throw new MultipleElementsFoundError(selector);
  }

  return $elt.get(0);
}
