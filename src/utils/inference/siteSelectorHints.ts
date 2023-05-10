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

export type SiteSelectorHint = {
  /**
   * Name for the rule hint-set.
   */
  siteName: string;
  /**
   * Return true if the these hints apply to the current site.
   */
  siteValidator: (element?: HTMLElement) => boolean;
  badPatterns: CssSelectorMatch[];
  requiredSelectors: string[];
  stableAnchors: CssSelectorMatch[];
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
  {
    // Matches all sites using Salesforce's Lightning framework
    // https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_components.htm
    siteName: "TestHint",
    siteValidator: (element) =>
      $(element).closest("[data-test-hint]").length > 0,
    badPatterns: [],
    requiredSelectors: [".grandparent>.parent"],
    stableAnchors: [],
    uniqueAttributes: [],
  },
];

export function getSiteSelectorHint(element: HTMLElement): SiteSelectorHint {
  let siteSelectorHint = SELECTOR_HINTS.find((hint) =>
    hint.siteValidator(element)
  );
  if (!siteSelectorHint) {
    siteSelectorHint = {
      siteName: "",
      siteValidator: () => false,
      badPatterns: [],
      uniqueAttributes: [],
      stableAnchors: [],
      requiredSelectors: [],
    };
  }

  return siteSelectorHint;
}
