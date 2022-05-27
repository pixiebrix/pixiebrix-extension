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

import {
  generateSelector,
  getAttributeSelector,
  getAttributeSelectorRegex,
  getSelectorPreference,
  inferSelectors,
  safeCssSelector,
  sortBySelector,
} from "./nativeEditor/selectorInference";
import { JSDOM } from "jsdom";
import { html } from "@/utils";
import { uniq } from "lodash";
import { EXTENSION_POINT_DATA_ATTR, PIXIEBRIX_DATA_ATTR } from "@/common";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- It's a global namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Must exist
    interface Matchers<R> {
      toFindSelector(selector: string): CustomMatcherResult;
    }
  }
}

function getDocument(html: string): Document {
  return new JSDOM(html).window.document;
}

expect.extend({
  toFindSelector(receivedHTML: string, selector: string) {
    const document = getDocument(receivedHTML);
    const element = document.querySelector<HTMLElement>(selector);
    const generatedSelector = generateSelector(element);

    return {
      pass: generatedSelector === selector,
      message: () =>
        `Expected \`${selector}\` but generated \`${generatedSelector}\``,
    };
  },
});

describe("generateSelector", () => {
  test("find simple selectors", () => {
    expect(html`<h1><span>Text</span></h1>`).toFindSelector("h1 > span");
    expect(
      html`
        <div>
          <div><h1></h1></div>
        </div>
      `
    ).toFindSelector("h1");
  });
});

describe("getAttributeSelector", () => {
  test("find ID selectors", () => {
    expect(getAttributeSelector("id", "hello")).toBe("#hello");
    expect(getAttributeSelector("id", "example.com")).toBe("#example\\.com");
  });
  test("find title selectors", () => {
    expect(getAttributeSelector("title", "Book")).toBe('[title="Book"]');
    expect(getAttributeSelector("title", "Book name")).toBe(
      '[title="Book name"]'
    );
    expect(getAttributeSelector("title", 'The "Great" Gatsby')).toBe(
      '[title="The \\"Great\\" Gatsby"]'
    );
  });
  test("find aria attribute selectors", () => {
    expect(getAttributeSelector("aria-title", "Your email")).toBe(
      '[aria-title="Your email"]'
    );
  });
  test("exclude non-unique selectors", () => {
    expect(getAttributeSelector("class", "bold italic")).toBe(undefined);
  });
});

function testAttribute(regex: RegExp, attribute: string) {
  expect(`[${attribute}]`).toMatch(regex);
  expect(`[${attribute}=anything]`).toMatch(regex);
  expect(`[${attribute}='anything']`).toMatch(regex);

  expect(`[no${attribute}]`).not.toMatch(regex);
  expect(`[no-${attribute}]`).not.toMatch(regex);
  expect(`[${attribute}d]`).not.toMatch(regex);
  expect(`[${attribute}-user]`).not.toMatch(regex);
  expect(`[${attribute}]:checked`).not.toMatch(regex);
}

test("getAttributeSelectorRegex", () => {
  const singleAttributeRegex = getAttributeSelectorRegex("name");
  testAttribute(singleAttributeRegex, "name");
  expect(singleAttributeRegex).toStrictEqual(/^\[name(=|]$)/);

  const multipleAttributeRegex = getAttributeSelectorRegex(
    "name",
    "aria-label"
  );
  testAttribute(multipleAttributeRegex, "name");
  testAttribute(multipleAttributeRegex, "aria-label");
  expect(multipleAttributeRegex).toStrictEqual(
    /^\[name(=|]$)|^\[aria-label(=|]$)/
  );
});

describe("safeCssSelector", () => {
  /* eslint-disable jest/expect-expect -- Custom expectSelector */
  const expectSelector = (selector: string, body: string) => {
    document.body.innerHTML = body;

    const inferredSelector = safeCssSelector(
      document.body.querySelector(selector),
      {
        excludeRandomClasses: true,
      }
    );

    expect(inferredSelector).toBe(selector);
  };

  test("infer aria-label", () => {
    expectSelector(
      "[aria-label='foo']",
      html`
        <div>
          <input aria-label="foo" />
          <input aria-label="bar" />
        </div>
      `
    );
  });
  test("infer class", () => {
    expectSelector(
      ".contacts",
      html`
        <ul>
          <li><a class="navItem about" href="/about">About</a></li>
          <li><a class="navItem contacts" href="/contacts">Contacts</a></li>
        </ul>
      `
    );
  });

  test("infer preferring class over aria-label", () => {
    expectSelector(
      ".foo",
      html`
        <div>
          <input class="foo" aria-label="foo" />
          <input class="bar" aria-label="bar" />
        </div>
      `
    );
  });

  test("infer preferring aria-label over random classes", () => {
    expectSelector(
      "[aria-label='foo']",
      html`
        <div>
          <input class="asij340snlslnakdi9" aria-label="foo" />
          <input class="aksjhd93rqansld00s" aria-label="bar" />
        </div>
      `
    );
  });

  test("infer class discarding random ones", () => {
    expectSelector(
      ".contacts",
      html`
        <ul>
          <li><a class="i3349fj9 about" href="/about">About</a></li>
          <li><a class="iauoff23 contacts" href="/contacts">Contacts</a></li>
        </ul>
      `
    );
  });

  test("infer title attribute", () => {
    expectSelector(
      "[title='The\\ \\\"Great\\\"\\ Gatsby']",
      html`
        <ul>
          <li><a title='The "Great" Gatsby' href="/about">About</a></li>
          <li><a title="The Other Gatsby" href="/contacts">Contacts</a></li>
        </ul>
      `
    );
  });

  test("infer id", () => {
    expectSelector(
      "#about",
      html`
        <ul>
          <li><a id="about" class="about" href="/about">About</a></li>
          <li>
            <a id="contacts" class="contacts" href="/contacts">Contacts</a>
          </li>
        </ul>
      `
    );
  });

  test("skip unstable IDs", () => {
    expectSelector(
      ".about",
      html`
        <ul>
          <li><a id="ember-23" class="about" href="/about">About</a></li>
          <li>
            <a id="ember-24" class="contacts" href="/contacts">Contacts</a>
          </li>
        </ul>
      `
    );
  });

  test("skip unstable attributes IDs", () => {
    expectSelector(
      "[aria-label='The\\ link']",
      html`
        <ul>
          <li>
            <a data-pb-extension-point aria-label="The link" href="/about">
              About
            </a>
          </li>
          <li><a href="/contacts" aria-label="The other link">Contacts</a></li>
        </ul>
      `
    );
  });

  /* eslint-enable jest/expect-expect */
});

describe("sortBySelector", () => {
  test("selector length", () => {
    expect(sortBySelector(["#abc", "#a"])).toStrictEqual(["#a", "#abc"]);
  });

  test("select field", () => {
    expect(
      sortBySelector(
        [{ foo: ".a" }, { foo: "#a" }],
        (x: { foo: string }) => x.foo
      )
    ).toStrictEqual([{ foo: "#a" }, { foo: ".a" }]);
  });
});

test("getSelectorPreference: matches expected sorting", () => {
  expect(getSelectorPreference("#best-link-on-the-page")).toBe(-2);
  expect(getSelectorPreference('[data-cy="b4da55"]')).toBe(-1);
  expect(getSelectorPreference(".navItem")).toBe(0);
  expect(getSelectorPreference(".birdsArentReal")).toBe(0);
  const selector = '[aria-label="Click elsewhere"]';
  expect(getSelectorPreference(selector)).toBe(1);

  // Even if it contains an ID, the selector is low quality
  const selector2 = "#name > :nth-child(2)";
  expect(getSelectorPreference(selector2)).toBe(2);
});

describe("inferSelectors", () => {
  const expectSelectors = (selectors: string[], body: string) => {
    document.body.innerHTML = body;

    // The provided selector list should only match one element
    const userSelectedElements = selectors.map((selector) =>
      document.body.querySelector<HTMLElement>(selector)
    );
    expect(uniq(userSelectedElements)).toHaveLength(1);

    // The provided selector list should match the inferred list
    const inferredSelectors = inferSelectors(userSelectedElements[0]);
    expect(inferredSelectors).toEqual(selectors);
  };

  test("infer aria-label", () => {
    expectSelectors(
      ["[aria-label='foo']"],
      html`
        <div>
          <input aria-label="foo" />
          <input aria-label="bar" />
        </div>
      `
    );
  });

  test("prefer unique selectors", () => {
    expectSelectors(
      ["[data-cy='baz']", ".zoolander"],
      html`
        <div>
          <input aria-label="foo" data-cy="baz" class="zoolander" />
          <input aria-label="bar" data-cy="zan" />
        </div>
      `
    );
  });

  test.each([["data-testid"], ["data-cy"], ["data-test"]])(
    "infer test attribute: %s",
    (attribute: string) => {
      expectSelectors(
        [`[${attribute}='a']`],
        html`<div><input ${attribute}="a" /><input ${attribute}="b" /></div>`
      );
    }
  );

  test.each([[PIXIEBRIX_DATA_ATTR], [EXTENSION_POINT_DATA_ATTR]])(
    "don't infer pixiebrix attribute: %s",
    (attribute: string) => {
      expectSelectors(
        ["[aria-label='foo']"],
        html`
          <div>
            <input ${attribute}="foo" aria-label="foo" />
            <input ${attribute}="bar" aria-label="bar" />
          </div>
        `
      );
    }
  );
});
