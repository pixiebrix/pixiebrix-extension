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

import { generateRecipeId } from "./recipeUtils";

describe("generateRecipeId", () => {
  test("no special chars", () => {
    expect(generateRecipeId("@test", "This Is a Test")).toEqual(
      "@test/this-is-a-test"
    );
  });

  test("handle colon", () => {
    expect(generateRecipeId("@test", "This: Is a Test")).toEqual(
      "@test/this-is-a-test"
    );
  });

  test("collapse spaces", () => {
    expect(generateRecipeId("@test", "This   Is a Test")).toEqual(
      "@test/this-is-a-test"
    );
  });

  test("return empty on invalid", () => {
    expect(generateRecipeId("", "This   Is a Test")).toBe("");
  });
});
