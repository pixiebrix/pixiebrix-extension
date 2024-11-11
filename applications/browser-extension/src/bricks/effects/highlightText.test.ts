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

import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import HighlightText from "@/bricks/effects/highlightText";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";

describe("ReplaceTextEffect", () => {
  test("can iterate body", () => {
    // Smoke test to ensure the body can be iterated. Had been getting error during testing with markjs: Failed to
    // execute 'createNodeIterator' on 'Document': parameter 1 is not of type 'Node'.
    document.body.innerHTML = "<div>foobar</div>";
    const nodeIterator = document.createNodeIterator(
      document.body,
      NodeFilter.SHOW_ELEMENT,
    );
    nodeIterator.nextNode();
  });

  test.each([[undefined], ["yellow"]])(
    "replace text beginning of div with color: %s",
    async (color) => {
      document.body.innerHTML = "<div>foobar</div>";
      const brick = new HighlightText();
      await brick.run(
        unsafeAssumeValidArg({
          pattern: "foo",
          color,
        }),
        brickOptionsFactory(),
      );

      expect(document.body.innerHTML).toBe(
        '<div><mark style="background-color: yellow;">foo</mark>bar</div>',
      );
    },
  );

  test("case insensitive match", async () => {
    document.body.innerHTML = "<div>fOobAr</div>";
    const brick = new HighlightText();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        isCaseInsensitive: true,
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div><mark style="background-color: yellow;">fOo</mark>bAr</div>',
    );
  });

  test("case sensitive default", async () => {
    document.body.innerHTML = "<div>fOobAr</div>";
    const brick = new HighlightText();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe("<div>fOobAr</div>");
  });

  test("escapes special chars in regex", async () => {
    document.body.innerHTML = "<div>[fOo]bAr</div>";
    const brick = new HighlightText();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[foo]",
        isCaseInsensitive: true,
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div><mark style="background-color: yellow;">[fOo]</mark>bAr</div>',
    );
  });

  test("replace text end of div", async () => {
    document.body.innerHTML = "<div>foobar</div>";
    const brick = new HighlightText();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "bar",
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div>foo<mark style="background-color: yellow;">bar</mark></div>',
    );
  });

  test("replace middle of div", async () => {
    document.body.innerHTML = "<div>foobar</div>";
    const brick = new HighlightText();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "oba",
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div>fo<mark style="background-color: yellow;">oba</mark>r</div>',
    );
  });

  test("don't re-highlight text", async () => {
    document.body.innerHTML = "<div>foobar</div>";
    const brick = new HighlightText();

    for (let i = 0; i < 2; i++) {
      // eslint-disable-next-line no-await-in-loop -- running in sequence
      await brick.run(
        unsafeAssumeValidArg({
          pattern: "foo",
        }),
        brickOptionsFactory(),
      );
    }

    expect(document.body.innerHTML).toBe(
      '<div><mark style="background-color: yellow;">foo</mark>bar</div>',
    );
  });

  test("don't re-highlight text with selector matching multiple levels", async () => {
    document.body.innerHTML = "<div><div>foobar</div></div>";
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        selector: "div",
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div><div><mark style="background-color: yellow;">foo</mark>bar</div></div>',
    );
  });

  test("highlight regex", async () => {
    document.body.innerHTML = "<div>foobar</div>";
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[fo]+",
        isRegex: true,
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div><mark style="background-color: yellow;">foo</mark>bar</div>',
    );
  });

  test("highlight with hex code", async () => {
    document.body.innerHTML = "<div>foobar</div>";
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        color: "#A020F0",
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      // `markjs` highlights with rgb
      '<div><mark style="background-color: rgb(160, 32, 240);">foo</mark>bar</div>',
    );
  });

  test("highlight multiple regex", async () => {
    document.body.innerHTML = "<div>foobarfoo</div>";
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[fo]+",
        isRegex: true,
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div><mark style="background-color: yellow;">foo</mark>bar<mark style="background-color: yellow;">foo</mark></div>',
    );
  });

  test("multiple elements", async () => {
    document.body.innerHTML = "<div><div>foo</div><div>foo</div></div>";
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[fo]+",
        isRegex: true,
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div><div><mark style="background-color: yellow;">foo</mark></div><div><mark style="background-color: yellow;">foo</mark></div></div>',
    );
  });

  test("excludes elements outside the body", async () => {
    document.title = "Support page";
    document.body.innerHTML = "<h1>Superlatives Abound</h1>";
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "Sup",
      }),
      brickOptionsFactory(),
    );

    expect(document.title).toBe("Support page");
    expect(document.body.innerHTML).toBe(
      '<h1><mark style="background-color: yellow;">Sup</mark>erlatives Abound</h1>',
    );
  });

  test("sanitize color HTML", async () => {
    document.body.innerHTML = "<div>foobar</div>";
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[fo]+",
        isRegex: true,
        color: '"<script>alert("xss")</script>',
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe("<div><mark>foo</mark>bar</div>");
  });

  test("sanitize HTML", async () => {
    document.body.innerHTML = "<div>foobar</div>";
    document.querySelector("div")!.textContent =
      "<script>alert('xss')</script>";

    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: ".+",
        isRegex: true,
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      // The text content was sanitized
      "<div><mark style=\"background-color: yellow;\">&lt;script&gt;alert('xss')&lt;/script&gt;</mark></div>",
    );
  });

  test("is root aware", async () => {
    document.body.innerHTML = "<div><h1>foobar</h1><h2>foobaz</h2></div>";
    const root: HTMLElement = document.querySelector("h1")!;

    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
      }),
      brickOptionsFactory({ root }),
    );

    expect(document.body.innerHTML).toBe(
      '<div><h1><mark style="background-color: yellow;">foo</mark>bar</h1><h2>foobaz</h2></div>',
    );
  });

  test("match across elements", async () => {
    document.body.innerHTML = "<div><span>foo</span><span>bar</span></div>";
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foobar",
        isAcrossElements: true,
      }),
      brickOptionsFactory(),
    );

    expect(document.body.innerHTML).toBe(
      '<div><span><mark style="background-color: yellow;">foo</mark></span><span><mark style="background-color: yellow;">bar</mark></span></div>',
    );
  });
});
