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

import { JSDOM } from "jsdom";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4 } from "@/types/helpers";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import HighlightText from "@/blocks/effects/highlightText";
import { type BlockOptions } from "@/core";

function getDocument(html: string): Document {
  return new JSDOM(html).window.document;
}

const logger = new ConsoleLogger({
  extensionId: uuidv4(),
});

describe("ReplaceTextEffect", () => {
  test.each([[undefined], ["yellow"]])(
    "replace text beginning of div with color: %s",
    async (color) => {
      const document = getDocument("<div>foobar</div>");
      const brick = new HighlightText();
      await brick.run(
        unsafeAssumeValidArg({
          pattern: "foo",
          color,
        }),
        { logger, root: document } as BlockOptions
      );

      expect(document.body.innerHTML).toEqual(
        '<div><mark style="background-color: yellow;">foo</mark>bar</div>'
      );
    }
  );

  test("replace text end of div", async () => {
    const document = getDocument("<div>foobar</div>");
    const brick = new HighlightText();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "bar",
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      '<div>foo<mark style="background-color: yellow;">bar</mark></div>'
    );
  });

  test("replace middle of div", async () => {
    const document = getDocument("<div>foobar</div>");
    const brick = new HighlightText();
    await brick.run(
      unsafeAssumeValidArg({
        pattern: "oba",
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      '<div>fo<mark style="background-color: yellow;">oba</mark>r</div>'
    );
  });

  test("don't re-highlight text", async () => {
    const document = getDocument("<div>foobar</div>");
    const brick = new HighlightText();

    for (let i = 0; i < 2; i++) {
      // eslint-disable-next-line no-await-in-loop -- running in sequence
      await brick.run(
        unsafeAssumeValidArg({
          pattern: "foo",
        }),
        { logger, root: document } as BlockOptions
      );
    }

    expect(document.body.innerHTML).toEqual(
      '<div><mark style="background-color: yellow;">foo</mark>bar</div>'
    );
  });

  test("don't re-highlight text with selector matching multiple levels", async () => {
    const document = getDocument("<div><div>foobar</div></div>");
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        selector: "div",
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      '<div><div><mark style="background-color: yellow;">foo</mark>bar</div></div>'
    );
  });

  test("highlight regex", async () => {
    const document = getDocument("<div>foobar</div>");
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[fo]+",
        isRegex: true,
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      '<div><mark style="background-color: yellow;">foo</mark>bar</div>'
    );
  });

  test("highlight with hex code", async () => {
    const document = getDocument("<div>foobar</div>");
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "foo",
        color: "#A020F0",
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      '<div><mark style="background-color: #A020F0;">foo</mark>bar</div>'
    );
  });

  test("highlight multiple regex", async () => {
    const document = getDocument("<div>foobarfoo</div>");
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[fo]+",
        isRegex: true,
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      '<div><mark style="background-color: yellow;">foo</mark>bar<mark style="background-color: yellow;">foo</mark></div>'
    );
  });

  test("multiple elements", async () => {
    const document = getDocument("<div><div>foo</div><div>foo</div></div>");
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[fo]+",
        isRegex: true,
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      '<div><div><mark style="background-color: yellow;">foo</mark></div><div><mark style="background-color: yellow;">foo</mark></div></div>'
    );
  });

  test("sanitize color HTML", async () => {
    const document = getDocument("<div>foobar</div>");
    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: "[fo]+",
        isRegex: true,
        color: '"<script>alert("xss")</script>',
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      '<div><mark style="background-color: &quot;<script>alert(&quot;xss&quot;)</script>;">foo</mark>bar</div>'
    );
  });

  test("sanitize HTML", async () => {
    const document = getDocument("<div>foobar</div>");
    document.querySelector("div").textContent = "<script>alert('xss')</script>";

    const brick = new HighlightText();

    await brick.run(
      unsafeAssumeValidArg({
        pattern: ".+",
        isRegex: true,
      }),
      { logger, root: document } as BlockOptions
    );

    expect(document.body.innerHTML).toEqual(
      // The text content was sanitized
      '<div><mark style="background-color: yellow;"></mark></div>'
    );
  });
});
