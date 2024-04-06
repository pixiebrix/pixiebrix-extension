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

export async function selectElement({
  mode = "element",
  root,
  isMulti: initialIsMulti = false,
  excludeRandomClasses,
}: {
  mode: SelectMode;
  isMulti?: boolean;
  root?: string;
  excludeRandomClasses?: boolean;
}): Promise<ElementInfo> {
  const rootElements = $safeFind(root).get();

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

      findSingleElement(selectors[0]);

      return pageScript.getElementInfo({
        selector: selectors[0],
      });
    }

    case "element": {
      let activeRoot: HTMLElement | null = null;

      if (isMulti) {
        // If there are rootElements, the elements must all be contained within the same root
        activeRoot = rootElements?.find((rootElement) =>
          elements.every((element) => rootElement.contains(element)),
        );

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

      const element = elements[0];
      // At least one much match, otherwise userSelectElement would have thrown
      activeRoot = rootElements?.find((rootElement) =>
        rootElement.contains(element),
      );

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
