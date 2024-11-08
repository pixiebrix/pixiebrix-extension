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

import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { JSDOM } from "jsdom";
import ReplaceTextEffect from "./replaceText";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

beforeEach(() => {
  // Isolate extension state between test
  jest.resetModules();
});

function getDocument(html: string): Document {
  return new JSDOM(html).window.document;
}

const brick = new ReplaceTextEffect();

describe("ReplaceTextEffect", () => {
  test("replace text shallow document", async () => {
    const document = getDocument("<div>foo</div>");
    const brick = new ReplaceTextEffect();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        replacement: "bar",
      }),
      brickOptionsFactory({ root: document }),
    );

    expect(document.body.innerHTML).toBe("<div>bar</div>");
  });

  test("replace all matches in node", async () => {
    const document = getDocument("<div>foofoo</div>");
    const brick = new ReplaceTextEffect();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        replacement: "bar",
      }),
      brickOptionsFactory({ root: document }),
    );

    expect(document.body.innerHTML).toBe("<div>barbar</div>");
  });

  test("is case case-sensitive", async () => {
    const document = getDocument("<div>FOO</div>");
    const brick = new ReplaceTextEffect();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        replacement: "bar",
      }),
      brickOptionsFactory({ root: document }),
    );

    expect(document.body.innerHTML).toBe("<div>FOO</div>");
  });

  test("replace text recursively in document", async () => {
    const document = getDocument("<div>foo <span>foo</span></div>");
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        replacement: "bar",
      }),
      brickOptionsFactory({ root: document }),
    );
    expect(document.body.innerHTML).toBe("<div>bar <span>bar</span></div>");
  });

  test("use selector", async () => {
    const document = getDocument("<div>foo <span>foo</span></div>");
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        replacement: "bar",
        selector: "span",
      }),
      brickOptionsFactory({ root: document }),
    );
    expect(document.body.innerHTML).toBe("<div>foo <span>bar</span></div>");
  });

  test("apply pattern once", async () => {
    const document = getDocument("<div>foo <div>foo</div></div>");
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        replacement: "foobar",
        selector: "div",
      }),
      brickOptionsFactory({ root: document }),
    );
    expect(document.body.innerHTML).toBe("<div>foobar <div>foobar</div></div>");
  });

  test("apply relative to root", async () => {
    const document = getDocument("<div>foo <span>foo</span></div>");
    const span = document.querySelector("span");
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        replacement: "bar",
      }),
      brickOptionsFactory({ root: span! }),
    );
    expect(document.body.innerHTML).toBe("<div>foo <span>bar</span></div>");
  });

  test("mask phone number regex", async () => {
    const document = getDocument("<div>123-456-7890</div>");
    await brick.run(
      unsafeAssumeValidArg({
        pattern: String.raw`^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}`,
        replacement: "###-###-####",
        isRegex: true,
      }),
      brickOptionsFactory({ root: document }),
    );
    expect(document.body.innerHTML).toBe("<div>###-###-####</div>");
  });

  test("supports replacement pattern", async () => {
    const document = getDocument("<div>123abc</div>");
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "(?<numbers>[0-9]+)[a-z]+",
        replacement: "$<numbers>",
        isRegex: true,
      }),
      brickOptionsFactory({ root: document }),
    );
    expect(document.body.innerHTML).toBe("<div>123</div>");
  });

  test("isRegex false", async () => {
    const document = getDocument("<div>123-456-7890</div>");
    await brick.run(
      unsafeAssumeValidArg({
        pattern: String.raw`^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}`,
        replacement: "###-###-####",
      }),
      brickOptionsFactory({ root: document }),
    );
    expect(document.body.innerHTML).toBe("<div>123-456-7890</div>");
  });

  test("excludes elements outside the body", async () => {
    const document = getDocument(
      "<title>Support page</title><h1>Superlatives Abound</h1>",
    );
    const brick = new ReplaceTextEffect();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "Sup",
        replacement: "Foo",
      }),
      brickOptionsFactory({ root: document }),
    );

    expect(document.head.innerHTML).toBe("<title>Support page</title>");
    expect(document.body.innerHTML).toBe("<h1>Fooerlatives Abound</h1>");
  });
});
