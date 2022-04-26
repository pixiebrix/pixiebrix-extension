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

import { removeEmptyValues, selectIsAvailable } from "./base";
import {
  extensionPointConfigFactory,
  extensionPointDefinitionFactory,
} from "@/testUtils/factories";

describe("removeEmptyValues()", () => {
  test("removes empty non-expression values", () => {
    expect(
      removeEmptyValues({ foo: "", bar: undefined, baz: null })
    ).toStrictEqual({ baz: null });
  });

  test("doesn't remove null and empty string expression values", () => {
    expect(
      removeEmptyValues({
        foo: { __type__: "var", __value__: "" },
        bar: { __type__: "mustache", __value__: "" },
        baz: { __type__: "var", __value__: null },
      })
    ).toStrictEqual({
      foo: { __type__: "var", __value__: "" },
      bar: { __type__: "mustache", __value__: "" },
      baz: { __type__: "var", __value__: null },
    });
  });

  test("convert undefined to null in expression values", () => {
    expect(
      removeEmptyValues({
        foo: { __type__: "nunjucks", __value__: undefined },
      })
    ).toStrictEqual({
      foo: { __type__: "nunjucks", __value__: null },
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

describe("selectIsAvailable", () => {
  it("normalizes matchPatterns", () => {
    const extensionPoint = extensionPointDefinitionFactory();
    extensionPoint.definition.isAvailable.matchPatterns =
      "https://www.example.com";
    delete extensionPoint.definition.isAvailable.selectors;
    delete extensionPoint.definition.isAvailable.urlPatterns;

    const normalized = selectIsAvailable(extensionPoint);

    expect(normalized.matchPatterns).toStrictEqual(["https://www.example.com"]);

    // Don't add properties that were undefined as part of normalization
    expect(normalized.selectors).toBeUndefined();
    expect(normalized.urlPatterns).toBeUndefined();
  });
});
