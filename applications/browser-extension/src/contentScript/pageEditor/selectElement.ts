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

import {
  findContainer,
  inferMultiElementSelector,
} from "@/utils/inference/selectorInference";
import * as pageScript from "@/pageScript/messenger/api";
import { type SelectMode } from "@/contentScript/pageEditor/types";
import { NoElementsFoundError } from "@/errors/businessErrors";
import { $safeFind, findSingleElement } from "@/utils/domUtils";
import inferSingleElementSelector from "@/utils/inference/inferSingleElementSelector";
import { type ElementInfo } from "@/utils/inference/selectorTypes";
import { userSelectElement } from "./elementPicker";

export default async function selectElement({
  mode = "element",
  root,
  isMulti: initialIsMulti = false,
  excludeRandomClasses = false,
}: {
  mode: SelectMode;
  isMulti?: boolean;
  root?: string;
  excludeRandomClasses?: boolean;
}): Promise<ElementInfo> {
  const rootElements = root ? $safeFind(root).get() : [];

  if (root && rootElements.length === 0) {
    throw new NoElementsFoundError(root);
  }

  const { elements, isMulti, shouldSelectSimilar } = await userSelectElement({
    roots: rootElements,
    isMulti: initialIsMulti,
  });

  console.debug("Selected elements", { elements, isMulti });

  switch (mode) {
    case "container": {
      if (root) {
        throw new Error(`root selector not implemented for mode: ${mode}`);
      }

      const { selectors } = findContainer(elements);

      findSingleElement(selectors[0] ?? "");

      return pageScript.getElementInfo({
        selector: selectors[0] ?? "",
      });
    }

    case "element": {
      let activeRoot: HTMLElement | null = null;

      if (isMulti) {
        // If there are rootElements, the elements must all be contained within the same root
        activeRoot =
          rootElements?.find((rootElement) =>
            elements.every((element) => rootElement.contains(element)),
          ) ?? null;

        return inferMultiElementSelector({
          elements,
          root: activeRoot,
          excludeRandomClasses,
          shouldSelectSimilar,
        });
      }

      if (elements.length !== 1) {
        console.warn(
          "Expected exactly one element for single element selector generation",
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- at least one element must be present
      const element = elements[0]!;
      // At least one must match, otherwise userSelectElement would have thrown
      activeRoot =
        rootElements?.find((rootElement) => rootElement.contains(element)) ??
        null;

      return inferSingleElementSelector({
        root: activeRoot,
        element,
        excludeRandomClasses,
      });
    }

    default: {
      const exhaustiveCheck: never = mode;
      throw new Error(`Unexpected mode: ${exhaustiveCheck}`);
    }
  }
}
