/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { $safeFind } from "@/helpers";
import {
  inferButtonHTML,
  inferPanelHTML,
  inferSelectors,
  safeCssSelector,
} from "@/nativeEditor/infer";
import * as assert from "assert";

test("infer basic button", () => {
  document.body.innerHTML = "<div><button>More</button></div>";

  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("button").get()
  );
  expect(inferred).toBe("<button>{{{ caption }}}</button>");
});

test("infer button with icon", () => {
  document.body.innerHTML = "<div><button><svg></svg>More</button></div>";

  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("button").get()
  );
  expect(inferred).toBe("<button>{{{ icon }}}{{{ caption }}}</button>");
});

test("infer submit button", () => {
  document.body.innerHTML = '<div><input type="submit" value="Submit" /></div>';
  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("input").get()
  );
  expect(inferred).toBe('<input type="button" value="{{{ caption }}}" />');
});

test("infer button", () => {
  document.body.innerHTML = '<div><input type="button" value="Action" /></div>';
  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("input").get()
  );
  expect(inferred).toBe('<input type="button" value="{{{ caption }}}" />');
});

test("ignore chevron down in key", () => {
  document.body.innerHTML =
    '<div><button>More <icon key="chevron-down"></icon></button></div>';
  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("button").get()
  );
  expect(inferred).toBe("<button>{{{ caption }}}</button>");
});

test("ignore chevron down in class name", () => {
  document.body.innerHTML =
    '<div><button>More <i class="fas fa-chevron-down"></i></button></div>';
  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("button").get()
  );
  expect(inferred).toBe("<button>{{{ caption }}}</button>");
});

test("infer anchor with button sibling", () => {
  document.body.innerHTML =
    "<div>" +
    '      <button class="follow org-company-follow-button org-top-card-primary-actions__action artdeco-button ember-view"><li-icon><svg width="16" height="16"></svg></li-icon>' +
    '  <span aria-hidden="true">Follow</span>' +
    "</button>" +
    '<a  href="#" class="ember-view org-top-card-primary-actions__action">' +
    '    <span class="org-top-card-primary-actions__action-inner artdeco-button artdeco-button--secondary">' +
    "            Visit website" +
    '            <li-icon><svg width="16" height="16"></svg></li-icon>' +
    "</span>" +
    "</a>" +
    "</div>";

  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("a").get()
  );
  expect(inferred).toBe(
    '<a href="#" class="org-top-card-primary-actions__action"><span class="org-top-card-primary-actions__action-inner artdeco-button artdeco-button--secondary">{{{ caption }}}<li-icon>{{{ icon }}}</li-icon></span></a>'
  );
});

test("infer bootstrap anchor button", () => {
  document.body.innerHTML =
    '<div><a href="/docs/5.0/getting-started/download/" class="btn btn-lg btn-outline-secondary mb-3">Download</a></div>';
  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("a").get()
  );
  expect(inferred).toBe(
    '<a href="#" class="btn btn-lg btn-outline-secondary mb-3">{{{ caption }}}</a>'
  );
});

test("infer list item mixed elements", () => {
  document.body.innerHTML =
    "<ul>" +
    "<li><button>Item 1</button></li>" +
    "<!---->" +
    "<!---->" +
    "<li><button>Item 2</button></li>" +
    "<li><a>Item 3</a></li>" +
    "</ul>";

  const inferred = inferButtonHTML(
    $safeFind("ul").get(0),
    $safeFind("button").toArray()
  );
  expect(inferred).toBe("<li><button>{{{ caption }}}</button></li>");
});

test("infer list item mixed elements with icons", () => {
  document.body.innerHTML =
    "<ul>" +
    "<li><button><li-icon><svg></svg></li-icon>Item 1</button></li>" +
    "<!---->" +
    "<!---->" +
    "<li><button><li-icon><svg></svg></li-icon>Item 2</button></li>" +
    "<li><a><li-icon><svg></svg></li-icon>Item 3</a></li>" +
    "</ul>";

  const inferred = inferButtonHTML(
    $safeFind("ul").get(0),
    $safeFind("button").toArray()
  );
  expect(inferred).toBe(
    "<li><button><li-icon>{{{ icon }}}</li-icon>{{{ caption }}}</button></li>"
  );
});

test("ignore blank surrounding div", () => {
  document.body.innerHTML =
    "<ul>" +
    "<li><button>Item 1</button></li>" +
    "<li>  \n<div>  <button>Item 2</button></div></li>" +
    "</ul>";

  const inferred = inferButtonHTML(
    $safeFind("ul").get(0),
    $safeFind("button").toArray()
  );
  expect(inferred).toBe("<li><button>{{{ caption }}}</button></li>");
});

test("infer list item mixed elements with surrounding div", () => {
  document.body.innerHTML =
    "<ul>" +
    "<li><button>Item 1</button></li>" +
    "<li><div><button>Item 2</button></div></li>" +
    "<li><a>Item 3</a></li>" +
    "</ul>";

  const inferred = inferButtonHTML(
    $safeFind("ul").get(0),
    $safeFind("button").toArray()
  );
  expect(inferred).toBe("<li><button>{{{ caption }}}</button></li>");
});

test("do not duplicate button caption", () => {
  document.body.innerHTML =
    '<div><button type="button"><!---->\n' +
    '<span class="artdeco-button__text">\n' +
    "    View in Sales Navigator\n" +
    "</span></button></div>";
  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("button").get()
  );
  expect(inferred).toBe(
    '<button type="button"><span class="artdeco-button__text">{{{ caption }}}</span></button>'
  );
});

test("infer ember button", () => {
  document.body.innerHTML =
    "<div>" +
    '<button aria-expanded="false" id="ember1167"' +
    ' class="ember-view artdeco-button"' +
    ' type="button" tabIndex="0">More<!----></button></div>';

  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("button").get()
  );

  expect(inferred).toBe(
    "<button" +
      ' class="artdeco-button"' +
      ' type="button">{{{ caption }}}</button>'
  );
});

test("infer multiple buttons", () => {
  document.body.innerHTML =
    "<div>" +
    '<button class="a b">Foo</button>' +
    '<button class="a c">Bar</button>' +
    "</div>";

  const inferred = inferButtonHTML(
    $safeFind("div").get(0),
    $safeFind("button").get()
  );

  expect(inferred).toBe('<button class="a">{{{ caption }}}</button>');
});

test("infer list items", () => {
  document.body.innerHTML = "<div><ul><li>Foo</li><li>Bar</li></ul></div>";

  const inferred = inferButtonHTML(
    $safeFind("ul").get(0),
    $safeFind("li").get()
  );

  expect(inferred).toBe("<li>{{{ caption }}}</li>");
});

test("infer list item from inside div", () => {
  document.body.innerHTML =
    "<div><ul>" +
    '<li><div class="x">Foo</div></li>' +
    '<li><div class="y">Bar</div></li>' +
    "</ul></div>";

  const inferred = inferButtonHTML(
    $safeFind("ul").get(0),
    $safeFind("li div").get()
  );

  expect(inferred).toBe("<li><div>{{{ caption }}}</div></li>");
});

test("infer single panel", () => {
  document.body.innerHTML =
    "<div>" +
    "<section><header><h2>Bar</h2></header><div><p>This is some other text</p></div></section>" +
    "</div>";

  const inferred = inferPanelHTML(
    $safeFind("div").get(0),
    $safeFind("section").get()
  );

  expect(inferred).toBe(
    "<section><header><h2>{{{ heading }}}</h2></header><div>{{{ body }}}</div></section>"
  );
});

test("infer basic panel structure with header", () => {
  document.body.innerHTML =
    "<div>" +
    "<section><header><h2>Foo</h2></header><div><p>This is some text</p></div></section>" +
    "<section><header><h2>Bar</h2></header><div><p>This is some other text</p></div></section>" +
    "</div>";

  const inferred = inferPanelHTML(
    $safeFind("div").get(0),
    $safeFind("section").get()
  );

  expect(inferred).toBe(
    "<section><header><h2>{{{ heading }}}</h2></header><div>{{{ body }}}</div></section>"
  );
});

test("infer basic panel structure with div header", () => {
  document.body.innerHTML =
    "<div>" +
    "<section><div><h2>Foo</h2></div><div><p>This is some text</p></div></section>" +
    "<section><div><h2>Bar</h2></div><div><p>This is some other text</p></div></section>" +
    "</div>";

  const inferred = inferPanelHTML(
    $safeFind("div").get(0),
    $safeFind("section").get()
  );

  expect(inferred).toBe(
    "<section><div><h2>{{{ heading }}}</h2></div><div>{{{ body }}}</div></section>"
  );
});

test("infer header structure mismatch", () => {
  document.body.innerHTML =
    "<div>" +
    "<section><h2>Foo</h2><div><p>This is some text</p></div></section>" +
    "<section><header><h2>Bar</h2></header><div><p>This is some other text</p></div></section>" +
    "</div>";

  const inferred = inferPanelHTML(
    $safeFind("div").get(0),
    $safeFind("section").get()
  );

  expect(inferred).toBe(
    "<section><h2>{{{ heading }}}</h2><div>{{{ body }}}</div></section>"
  );
});

describe("safeCssSelector", () => {
  test("infer aria-label", () => {
    document.body.innerHTML =
      "<div>" +
      "<input aria-label='foo'/>" +
      "<input aria-label='bar'/>" +
      "</div>";

    const selector = safeCssSelector(
      document.body.querySelector("input[aria-label='foo']"),
      null
    );

    expect(selector).toBe("[aria-label='foo']");
  });
});

describe("inferSelectors", () => {
  test("infer aria-label", () => {
    document.body.innerHTML =
      "<div>" +
      "<input aria-label='foo'/>" +
      "<input aria-label='bar'/>" +
      "</div>";

    const selector = inferSelectors(
      document.body.querySelector("input[aria-label='foo']")
    );

    expect(selector).toStrictEqual(["[aria-label='foo']"]);
  });

  test.each([["data-testid"], ["data-cy"], ["data-test"]])(
    "infer test attribute: %s",
    (attr: string) => {
      document.body.innerHTML =
        "<div>" + `<input ${attr}='a' />` + `<input ${attr}='b' />` + "</div>";

      const selector = inferSelectors(
        document.body.querySelector(`input[${attr}='a']`)
      );

      expect(selector).toStrictEqual([`[${attr}='a']`]);
    }
  );
});
