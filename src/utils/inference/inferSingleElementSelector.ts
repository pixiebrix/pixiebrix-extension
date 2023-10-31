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

import { mapValues, uniq } from "lodash";
import { $safeFind } from "@/utils/domUtils";
import {
  doesSelectOneElement,
  type InferSelectorArgs,
  inferSelectorsIncludingStableAncestors,
  safeCssSelector,
} from "@/utils/inference/selectorInference";
import {
  getSiteSelectorHint,
  type SelectorTemplate,
} from "@/utils/inference/siteSelectorHints";
import { type ElementInfo } from "@/utils/inference/selectorTypes";
import { renderString } from "nunjucks";

function getMatchingRequiredSelectors(
  element: HTMLElement,
  requiredSelectors: string[]
): string {
  return requiredSelectors.find((selector) => element.matches(selector));
}

/**
 * Return selectors for ancestors of the element based on the matching selector hint, if any hint matches.
 * @param element The element to generate selectors for
 * @param root the root to generate selectors against, either a DOM element or the document
 */
function mapSelectorOverrideToAncestors(
  element: HTMLElement,
  root: HTMLElement | Document
): Array<{ element: HTMLElement; selectorOverride: string }> {
  const { requiredSelectors, selectorTemplates } = getSiteSelectorHint(element);

  const ancestors =
    root === document
      ? $(element).parents().get()
      : $(element)
          .parentsUntil(root as HTMLElement)
          .get();

  // Ancestors from root to element
  ancestors.reverse();

  let currentRoot = root;
  const result = [];

  for (const ancestor of ancestors) {
    const selectorOverride =
      getAncestorSelectorTemplate({
        ancestorElement: ancestor,
        root: currentRoot,
        templates: selectorTemplates,
      }) ?? getMatchingRequiredSelectors(ancestor, requiredSelectors);

    if (selectorOverride) {
      currentRoot = ancestor;
      result.push({ element: ancestor, selectorOverride });
    }
  }

  return result;
}

/**
 * Return a selector matching one of the provided templates, or null if none of the templates match
 * @param ancestorElement an ancestor of the element to generate the selector for
 * @param templates the selector templates/stencils to try
 * @param root the root element to generate selectors relative to. Used to ensure the generated selector is unique
 */
function getAncestorSelectorTemplate({
  ancestorElement,
  root,
  templates,
}: {
  ancestorElement: HTMLElement;
  templates: SelectorTemplate[];
  root?: HTMLElement | Document | JQuery<HTMLElement | Document>;
}): string | null {
  // Find first template that matches and uniquely selects the ancestor
  return templates
    .map((template) =>
      maybeInstantiateSelectorTemplate(ancestorElement, template)
    )
    .find(
      (selector) => selector != null && doesSelectOneElement(selector, root)
    );
}

function getElementAttributes(element: HTMLElement) {
  const attributes: Record<string, string> = {};

  $.each(element.attributes, function () {
    attributes[this.name] = this.value;
  });

  return attributes;
}

function maybeInstantiateSelectorTemplate(
  ancestorElement: HTMLElement,
  template: SelectorTemplate
): string | null {
  if (!ancestorElement.matches(template.selector)) {
    return null;
  }

  const extractedValues = mapValues(template.extract, (extractRule: string) => {
    const element = $safeFind(extractRule, ancestorElement);

    if (!element) {
      return null;
    }

    return {
      ...getElementAttributes(element[0]),
      text: element.text(),
    };
  });

  // All extraction rules must match, otherwise return no match
  if (Object.values(extractedValues).some((value) => value == null)) {
    return null;
  }

  return renderString(template.template, extractedValues);
}

/**
 * Infers valids selectors for a single element.
 *
 * Since 1.8.2, this method resides in the contentScript subdirectory because it sends messages to the pageScript.
 *
 * @see inferMultiElementSelector
 */
async function inferSingleElementSelector({
  element,
  root,
  excludeRandomClasses,
}: InferSelectorArgs & {
  element: HTMLElement;
}): Promise<ElementInfo> {
  // Ancestors in order from root to element
  const ancestorSelectorOverrides = mapSelectorOverrideToAncestors(
    element,
    root
  );

  const ancestorSelectors = ancestorSelectorOverrides.map(
    ({ selectorOverride }) => selectorOverride
  );

  const rootOverride =
    // Scope the element generation to the innermost ancestor with a selector override
    ancestorSelectorOverrides.length > 0
      ? ancestorSelectorOverrides.at(-1).element
      : root;

  const selectorWithRootOverride = safeCssSelector([element], {
    root: rootOverride,
    excludeRandomClasses,
  });

  // Prepend all the selectors with the required selectors
  const inferredSelectors = uniq(
    [
      selectorWithRootOverride,
      ...inferSelectorsIncludingStableAncestors(element, rootOverride),
    ].map((selector) => [...ancestorSelectors, selector].join(" "))
  );

  // Filter out any malformed selectors and/or selectors that don't exactly match the element
  const validatedSelectors = inferredSelectors.filter((selector) => {
    try {
      const match = $safeFind(selector, root);
      return match.length === 1 && match.get(0) === element;
    } catch {
      console.warn("Invalid selector", selector);
      // Catch invalid selectors
      return false;
    }
  });

  if (validatedSelectors.length === 0) {
    throw new Error("Automatic selector generation failed");
  }

  return {
    selectors: validatedSelectors,
    tagName: element.tagName,
    parent: null,
  };
}

export default inferSingleElementSelector;
