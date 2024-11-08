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

import {
  getImplicitReader,
  removeEmptyValues,
  selectStarterBrickAvailability,
} from "./base";
import {
  type StarterBrickType,
  StarterBrickTypes,
} from "../../types/starterBrickTypes";
import { type ReaderConfig } from "@/bricks/types";
import { validateRegistryId } from "../../types/helpers";
import { starterBrickDefinitionFactory } from "../../testUtils/factories/modDefinitionFactories";
import { toExpression } from "../../utils/expressionUtils";

describe("removeEmptyValues()", () => {
  test("removes empty non-expression values", () => {
    expect(
      removeEmptyValues({ foo: "", bar: undefined, baz: null }),
    ).toStrictEqual({ baz: null });
  });

  test("doesn't remove null and empty string expression values", () => {
    expect(
      removeEmptyValues({
        foo: toExpression("var", ""),
        bar: toExpression("mustache", ""),
        baz: toExpression("var", null),
      }),
    ).toStrictEqual({
      foo: toExpression("var", ""),
      bar: toExpression("mustache", ""),
      baz: toExpression("var", null),
    });
  });

  test("convert undefined to null in expression values", () => {
    expect(
      removeEmptyValues({
        foo: toExpression("nunjucks", undefined as unknown as null),
      }),
    ).toStrictEqual({
      foo: toExpression("nunjucks", null),
    });
  });

  test("removes empty nested values", () => {
    expect(
      removeEmptyValues({
        extension: {
          action: [{ id: "@pixiebrix/jq", config: { data: "", filter: "." } }],
        },
      }),
    ).toStrictEqual({
      extension: {
        action: [{ id: "@pixiebrix/jq", config: { filter: "." } }],
      },
    });
  });
});

describe("selectIsAvailable", () => {
  it("normalizes matchPatterns", () => {
    const starterBrick = starterBrickDefinitionFactory();
    starterBrick.definition.isAvailable.matchPatterns =
      "https://www.example.com";
    delete starterBrick.definition.isAvailable.selectors;
    delete starterBrick.definition.isAvailable.urlPatterns;

    const normalized = selectStarterBrickAvailability(starterBrick);

    expect(normalized).toStrictEqual({
      matchPatterns: ["https://www.example.com"],
      // As of 2.0.2, properties are added during normalization
      selectors: [],
      urlPatterns: [],
      allFrames: true,
    });
  });
});

describe("getImplicitReader", () => {
  it.each([
    [StarterBrickTypes.BUTTON],
    [StarterBrickTypes.QUICK_BAR_ACTION],
    [StarterBrickTypes.DYNAMIC_QUICK_BAR],
    [StarterBrickTypes.CONTEXT_MENU],
    [StarterBrickTypes.TRIGGER],
    [StarterBrickTypes.SIDEBAR_PANEL],
  ])("includes metadata reader for %s", (type: StarterBrickType) => {
    expect(getImplicitReader(type)).toContainEqual(
      "@pixiebrix/document-metadata",
    );
  });

  it.each([
    [StarterBrickTypes.BUTTON],
    [StarterBrickTypes.QUICK_BAR_ACTION],
    [StarterBrickTypes.DYNAMIC_QUICK_BAR],
    [StarterBrickTypes.CONTEXT_MENU],
    [StarterBrickTypes.TRIGGER],
    [StarterBrickTypes.SIDEBAR_PANEL],
  ])(
    "overrides url from metadata reader with current URL from context reader",
    (type: StarterBrickType) => {
      const readerArray = getImplicitReader(type) as ReaderConfig[];

      const metadataIndex = readerArray.indexOf(
        validateRegistryId("@pixiebrix/document-metadata"),
      );
      const contextIndex = readerArray.indexOf(
        validateRegistryId("@pixiebrix/document-context"),
      );

      expect(metadataIndex).toBeGreaterThan(-1);
      expect(contextIndex).toBeGreaterThan(-1);
      expect(contextIndex).toBeGreaterThan(metadataIndex);
    },
  );

  it.each([
    [StarterBrickTypes.BUTTON],
    [StarterBrickTypes.QUICK_BAR_ACTION],
    [StarterBrickTypes.DYNAMIC_QUICK_BAR],
    [StarterBrickTypes.CONTEXT_MENU],
    [StarterBrickTypes.TRIGGER],
  ])("includes element reader for %s", (type: StarterBrickType) => {
    expect(getImplicitReader(type)).toContainEqual({
      element: "@pixiebrix/html/element",
    });
  });

  it(`does not include element reader for ${StarterBrickTypes.SIDEBAR_PANEL}`, () => {
    expect(
      getImplicitReader(StarterBrickTypes.SIDEBAR_PANEL),
    ).not.toContainEqual({
      element: "@pixiebrix/html/element",
    });
  });
});
