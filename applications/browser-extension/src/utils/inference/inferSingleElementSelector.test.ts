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

import { SELECTOR_HINTS } from "./siteSelectorHints";
import { html } from "code-tag";
import { $safeFind } from "../domUtils";
import { siteSelectorHintFactory } from "../../testUtils/factories/selectorFactories";
import inferSingleElementSelector from "./inferSingleElementSelector";

describe("inferElementSelector", () => {
  beforeEach(() => {
    SELECTOR_HINTS.length = 0;
    SELECTOR_HINTS.push({
      siteName: "TestHint",
      siteValidator: ({ element }: { element: HTMLElement }) =>
        $(element).closest("[data-test-hint]").length > 0,
      badPatterns: [],
      requiredSelectors: [".grandparent>.parent", ".active"],
      selectorTemplates: [
        {
          template: '.container:has(.testLabel:contains("{{ label.text }}"))',
          selector: ".container",
          extract: {
            label: ".testLabel",
          },
        },
      ],
      stableAnchors: [],
      uniqueAttributes: [],
    });
  });

  it("ignores site hint if siteValidator doesn't match", async () => {
    document.body.innerHTML = html`
      <div id="grandparent" class="grandparent">
        <div class="parent" role="main">
          <div id="test"></div>
        </div>
      </div>
    `;

    const element = document.body.querySelector<HTMLElement>("#test")!;
    await expect(
      inferSingleElementSelector({
        element,
        root: document.body,
        excludeRandomClasses: true,
      }),
    ).resolves.toStrictEqual({
      parent: null,
      // Site hint doesn't match, so requiredSelectors has not effect
      selectors: [
        "#test",
        "[role='main'] div",
        "#grandparent #test",
        "[role='main'] #test",
        "#grandparent .parent div",
        ".parent div",
      ],
      tagName: "DIV",
    });
  });

  it("requiredSelector should override other inferred selectors", async () => {
    document.body.innerHTML = html`
      <div id="grandparent" class="grandparent" data-test-hint="true">
        <div class="parent" role="main">
          <div id="test"></div>
        </div>
      </div>
    `;

    const element = document.body.querySelector<HTMLElement>("#test")!;
    await expect(
      inferSingleElementSelector({
        element,
        root: document.body,
        excludeRandomClasses: true,
      }),
    ).resolves.toStrictEqual({
      parent: null,
      selectors: [".grandparent>.parent #test", ".grandparent>.parent div"],
      tagName: "DIV",
    });
  });

  it("selector template", async () => {
    document.body.innerHTML = html`
      <div data-test-hint="true">
        <div class="container">
          <span class="testLabel">test label</span>
          <div class="testValue">Test Label Value</div>
        </div>
      </div>
    `;

    const element = document.body.querySelector<HTMLElement>(".testValue")!;
    await expect(
      inferSingleElementSelector({
        element,
        root: document.body,
        excludeRandomClasses: true,
      }),
    ).resolves.toStrictEqual({
      parent: null,
      selectors: [
        '.container:has(.testLabel:contains("test label")) div',
        '.container:has(.testLabel:contains("test label")) .testValue',
      ],
      tagName: "DIV",
    });
  });

  it("excludes selector hint with multiple matches", async () => {
    // "label" is a substring of "test label". If generating with the stencil, both would match because `contains` in
    // the stencil match substrings, not exact matches.
    document.body.innerHTML = html`
      <div data-test-hint="true">
        <div class="container">
          <span class="testLabel">test label</span>
          <div class="testValue">Test Label Value</div>
        </div>
        <div class="container">
          <span class="testLabel">label</span>
          <div class="testValue">Label Value</div>
        </div>
      </div>
    `;

    const element = $safeFind(".testValue:last").get(0)!;

    expect(element.textContent).toBe("Label Value");

    await expect(
      inferSingleElementSelector({
        element,
        root: document.body,
        excludeRandomClasses: true,
      }),
    ).resolves.toStrictEqual({
      parent: null,
      // Doesn't return the instantiated template, because it would match both field.
      // These selectors are not very robust. We'll fix those in future improvements to general selector generation.
      selectors: [
        "div:nth-of-type(2) div",
        ".container:nth-child(2) div",
        ".container:nth-child(2) .testValue",
        "[data-test-hint] > :nth-child(2) div",
      ],
      tagName: "DIV",
    });
  });

  it("handles template within required root", async () => {
    // "label" is a substring of "test label". It's unique within .active so it should be used
    document.body.innerHTML = html`
      <div data-test-hint="true">
        <div>
          <div class="container">
            <span class="testLabel">test label</span>
            <div class="testValue">Test Label Value</div>
          </div>
        </div>
        <div class="active">
          <div class="container">
            <span class="testLabel">label</span>
            <div class="testValue">Label Value</div>
          </div>
        </div>
      </div>
    `;

    const element = $safeFind(".active .testValue").get(0)!;

    expect(element.textContent).toBe("Label Value");

    await expect(
      inferSingleElementSelector({
        element,
        root: document.body,
        excludeRandomClasses: true,
      }),
    ).resolves.toStrictEqual({
      parent: null,
      selectors: [
        '.active .container:has(.testLabel:contains("label")) div',
        '.active .container:has(.testLabel:contains("label")) .testValue',
      ],
      tagName: "DIV",
    });
  });

  it("handles hostname-based site hint", async () => {
    window.location.assign("https://www.example.com/");

    SELECTOR_HINTS.push(
      siteSelectorHintFactory({
        // Need an extra layer because it's a factory override
        siteValidator:
          () =>
          ({ location }: { element: HTMLElement; location: Location }) =>
            location.hostname === "www.example.com",
        requiredSelectors: [".container"],
      }),
    );

    document.body.innerHTML = html`
      <div>
        <div>
          <div class="container">
            <span class="testLabel">test label</span>
            <div class="testValue">Test Label Value</div>
          </div>
        </div>
      </div>
    `;

    const element = $safeFind(".testValue").get(0)!;

    await expect(
      inferSingleElementSelector({
        element,
        root: document.body,
        excludeRandomClasses: true,
      }),
    ).resolves.toStrictEqual({
      parent: null,
      selectors: [".container div", ".container .testValue"],
      tagName: "DIV",
    });
  });
});
