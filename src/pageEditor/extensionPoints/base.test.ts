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

import {
  getImplicitReader,
  removeEmptyValues,
  selectIsAvailable,
} from "./base";
import { type ExtensionPointType } from "@/extensionPoints/types";
import { type ReaderConfig } from "@/blocks/types";
import { validateRegistryId } from "@/types/helpers";
import { extensionPointDefinitionFactory } from "@/testUtils/factories/recipeFactories";

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

describe("getImplicitReader", () => {
  it.each([
    ["menuItem"],
    ["quickBar"],
    ["quickBarProvider"],
    ["contextMenu"],
    ["trigger"],
    ["panel"],
    ["sidePanel"],
  ])("includes metadata reader for %s", (type: ExtensionPointType) => {
    expect(getImplicitReader(type)).toContainEqual(
      "@pixiebrix/document-metadata"
    );
  });

  it.each([
    ["menuItem"],
    ["quickBar"],
    ["quickBarProvider"],
    ["contextMenu"],
    ["trigger"],
    ["panel"],
    ["sidePanel"],
  ])(
    "overrides url from metadata reader with current URL from context reader",
    (type: ExtensionPointType) => {
      const readerArray = getImplicitReader(type) as ReaderConfig[];

      const metadataIndex = readerArray.indexOf(
        validateRegistryId("@pixiebrix/document-metadata")
      );
      const contextIndex = readerArray.indexOf(
        validateRegistryId("@pixiebrix/document-context")
      );

      expect(metadataIndex).toBeGreaterThan(-1);
      expect(contextIndex).toBeGreaterThan(-1);
      expect(contextIndex).toBeGreaterThan(metadataIndex);
    }
  );

  it.each([
    ["menuItem"],
    ["quickBar"],
    ["quickBarProvider"],
    ["contextMenu"],
    ["trigger"],
  ])("includes element reader for %s", (type: ExtensionPointType) => {
    expect(getImplicitReader(type)).toContainEqual({
      element: "@pixiebrix/html/element",
    });
  });

  it.each([["panel"], ["sidePanel"]])(
    "does not include element reader for %s",
    (type: ExtensionPointType) => {
      expect(getImplicitReader(type)).not.toContainEqual({
        element: "@pixiebrix/html/element",
      });
    }
  );
});
