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

import { uniq } from "lodash";
import { inferSelectorsIncludingStableAncestors } from "../utils/inference/selectorInference";
import { type ElementInfo } from "../utils/inference/selectorTypes";

export async function elementInfo(
  element: HTMLElement | null,
  selectors: string[] = [],
  traverseUp = 0,
): Promise<ElementInfo | undefined> {
  if (traverseUp < 0 || !element) {
    return undefined;
  }

  console.debug(`elementInfo: building element info for ${element.tagName}`, {
    element,
    selectors,
  });

  const inferredSelectors = uniq([
    ...(selectors ?? []),
    ...inferSelectorsIncludingStableAncestors(element),
  ]);

  console.debug(`elementInfo: inferred selectors for ${element.tagName}`, {
    inferredSelectors,
  });

  return {
    selectors: inferredSelectors,
    tagName: element.tagName,
    parent: await elementInfo(element.parentElement, [], traverseUp - 1),
  };
}
