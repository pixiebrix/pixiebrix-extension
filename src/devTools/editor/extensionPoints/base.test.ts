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

import { removeEmptyValues } from "./base";

describe("removeEmptyValues()", () => {
  test("removes empty non-expression values", () => {
    expect(
      removeEmptyValues({ foo: "", bar: undefined, baz: null })
    ).toStrictEqual({ baz: null });
  });

  test("doesn't remove empty expression values", () => {
    expect(
      removeEmptyValues({
        foo: { __type__: "var", __value__: "" },
        bar: { __type__: "nunjucks", __value__: undefined },
        baz: { __type__: "var", __value__: null },
        quux: { __type__: "mustache", __value__: "" },
      })
    ).toStrictEqual({
      foo: { __type__: "var", __value__: "" },
      bar: { __type__: "nunjucks", __value__: null },
      baz: { __type__: "var", __value__: null },
      quux: { __type__: "mustache", __value__: "" },
    });
  });

  test("removes empty nested values", () => {
    expect(
      removeEmptyValues({
        extension: {
          action: [{ id: "@pixiebrix/jq", config: { data: "", filter: "." } }],
        },
      })
    ).toStrictEqual({
      extension: {
        action: [{ id: "@pixiebrix/jq", config: { filter: "." } }],
      },
    });
  });
});
