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

import { type CssSelectorMatch } from "css-selector-generator/types/types";
import { getAttributeSelectorRegex } from "@/utils/inference/selectorInference";

/**
 * A template/stencil for generating selectors on an application.
 */
export interface SelectorTemplate {
  /**
   * The selector template/stencil. Will be filled in with the extract values.
   */
  template: string;
  /**
   * The ancestor selector to use to match if the template/stencil can be used to generate a selector.
   */
  selector: string;
  /**
   * Extraction rules, executed relative to the element found with `selector`. The keys are names of properties
   * that can be referenced in the template. The values are JQuery/CSS Selectors.
   */
  extract: Record<string, string>;
}

/**
 * A site-specific hint for generating selectors.
 */
export type SiteSelectorHint = {
  /**
   * Name for the rule hint-set.
   */
  siteName: string;
  /**
   * Return true if the these hints apply to the current site.
   */
  siteValidator: (element?: HTMLElement) => boolean;
  /**
   * Patterns to exclude from generated selectors.
   * @see safeCssSelector
   */
  badPatterns: CssSelectorMatch[];
  /**
   * If any of these selectors apply, they will be included in the generated selector. Useful for SPA sites that have
   * tabs/workspaces, e.g., Salesforce and Zendesk.
   */
  requiredSelectors: string[];
  /**
   * Selector templates/stencils to generate more complex selector patterns from.
   */
  selectorTemplates: SelectorTemplate[];
  /**
   * Robust ancestor selectors to scope generated selectors.
   */
  stableAnchors: CssSelectorMatch[];
  /**
   * Attributes that are known to indicate a unique element on the site.
   */
  uniqueAttributes: string[];
};

export const SELECTOR_HINTS: SiteSelectorHint[] = [
  {
    // Matches all sites using Salesforce's Lightning framework
    // https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_components.htm
    siteName: "Salesforce",
    siteValidator: (element) =>
      $(element).closest("[data-aura-rendered-by]").length > 0,
    badPatterns: [
      getAttributeSelectorRegex(
        // Salesforce Aura component tracking
        "data-aura-rendered-by",
        "data-interactive-lib-uid",
        // https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir
        "dir"
      ),

      /#\\+\d+ \d+\\+:0/,
      /#\w+[_-]\d+/,
      /.*\.hover.*/,
      /.*\.not-selected.*/,
      /^\[name='leftsidebar'] */,
    ],
    requiredSelectors: ['[role="main"]>.active'],
    selectorTemplates: [
      {
        template:
          '.slds-form-element:has(.test-id__field-label:contains("{{ label.text }}"))',
        // Check if element is a labelled form detail element
        selector: ".slds-form-element:has(.test-id__field-label)",
        extract: {
          label: ".test-id__field-label",
        },
      },
    ],
    stableAnchors: [
      ".active",
      ".consoleRelatedRecord",
      /\.consoleRelatedRecord\d+/,
      ".navexWorkspaceManager",
      ".oneConsoleTab",
      ".oneWorkspaceTabWrapper",
      ".tabContent",
    ],
    uniqueAttributes: ["data-component-id"],
  },
];

/**
 * Returns the site selector hint that applies for the given element.
 * @param element the element to generate a selector for
 */
export function getSiteSelectorHint(element: HTMLElement): SiteSelectorHint {
  const siteSelectorHint = SELECTOR_HINTS.find((hint) =>
    hint.siteValidator(element)
  );

  return (
    siteSelectorHint ?? {
      siteName: "",
      siteValidator: () => false,
      badPatterns: [],
      uniqueAttributes: [],
      selectorTemplates: [],
      stableAnchors: [],
      requiredSelectors: [],
    }
  );
}
