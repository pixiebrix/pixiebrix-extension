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

import { renderExplicit, renderImplicit } from "@/runtime/mapArgs";
import Mustache from "mustache";
import { engineRenderer } from "@/runtime/renderers";
import blockRegistry from "@/blocks/registry";
import { echoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock);
});

function expr(type: string, value: unknown) {
  return {
    __type__: type,
    __value__: value,
  };
}

describe("renderExplicit", () => {
  test("render var path", async () => {
    const rendered = await renderExplicit(
      { foo: { __type__: "var", __value__: "array.0" } },
      { array: ["bar"] }
    );

    expect(rendered).toEqual({
      foo: "bar",
    });
  });

  test("render mustache", async () => {
    const rendered = await renderExplicit(
      { foo: { __type__: "mustache", __value__: "{{ array.0 }}!" } },
      { array: ["bar"] }
    );

    expect(rendered).toEqual({
      foo: "bar!",
    });
  });

  describe("repeat expression", () => {
    test("render repeat with default elementKey", async () => {
      const rendered = await renderExplicit(
        {
          foo: expr("repeat", {
            data: expr("var", "array"),
            element: expr("mustache", "{{ element }}!"),
          }),
        },
        { array: ["bar", "baz"] }
      );

      expect(rendered).toEqual({
        foo: ["bar!", "baz!"],
      });
    });

    test("render repeat with custom elementKey", async () => {
      const rendered = await renderExplicit(
        {
          foo: expr("repeat", {
            data: expr("var", "array"),
            elementKey: "myKey",
            element: expr("mustache", "{{ myKey }}!"),
          }),
        },
        { array: ["bar", "baz"] }
      );

      expect(rendered).toEqual({
        foo: ["bar!", "baz!"],
      });
    });
  });

  describe("brick expression", () => {
    test("render repeat with default elementKey", async () => {
      const rendered = await renderExplicit(
        {
          foo: expr("brick", {
            id: echoBlock.id,
            config: {
              message: expr("mustache", "{{ value }}!"),
            },
          }),
        },
        { value: "bar" }
      );

      expect(rendered).toEqual({
        foo: {
          message: "bar!",
        },
      });
    });
  });
});

describe("renderImplicit", () => {
  test("prefer path to renderer", () => {
    expect(
      renderImplicit({ foo: "array.0" }, { array: ["bar"] }, Mustache.render)
    ).toEqual({
      foo: "bar",
    });
  });

  test("render path as string if it doesn't exist in the context", () => {
    expect(
      renderImplicit({ foo: "array.0" }, { otherVar: ["bar"] }, Mustache.render)
    ).toEqual({
      foo: "array.0",
    });
  });
});

describe("handlebars", () => {
  test("render array item", async () => {
    expect(
      renderImplicit(
        { foo: "{{ obj.prop }}" },
        { obj: { prop: 42 } },
        await engineRenderer("handlebars")
      )
    ).toEqual({
      foo: "42",
    });
  });

  // NOTE: Handlebars doesn't work with @-prefixed variable because it uses @ to denote data variables
  // see: https://handlebarsjs.com/api-reference/data-variables.html
  test("cannot render @-prefixed variable", async () => {
    expect(
      renderImplicit(
        { foo: "{{ obj.prop }}" },
        { "@obj": { prop: 42 } },
        await engineRenderer("handlebars")
      )
    ).toEqual({
      foo: "",
    });
  });
});
