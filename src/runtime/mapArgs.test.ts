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

describe("defer", () => {
  test("render !defer stops at defer", async () => {
    const config = {
      foo: {
        __type__: "var",
        __value__: "foo",
      },
    };

    const rendered = await renderExplicit(
      {
        foo: {
          __type__: "defer",
          __value__: config,
        },
        bar: config,
      },
      { foo: 42 }
    );

    expect(rendered).toEqual({
      foo: config,
      bar: { foo: 42 },
    });
  });
});

describe("pipeline", () => {
  test("render !pipeline", async () => {
    const rendered = await renderExplicit(
      {
        foo: {
          __type__: "pipeline",
          __value__: [{ id: "@pixiebrix/confetti" }],
        },
      },
      { array: ["bar"] }
    );

    expect(rendered).toEqual({
      foo: [{ id: "@pixiebrix/confetti" }],
    });
  });

  test("render !pipeline stops at pipeline", async () => {
    const config = {
      foo: {
        __type__: "var",
        __value__: "foo",
      },
    };

    const rendered = await renderExplicit(
      {
        foo: {
          __type__: "pipeline",
          __value__: [
            {
              id: "@pixiebrix/confetti",
              config,
            },
          ],
        },
        bar: config,
      },
      { foo: 42 }
    );

    expect(rendered).toEqual({
      foo: [{ id: "@pixiebrix/confetti", config }],
      bar: { foo: 42 },
    });
  });
});
