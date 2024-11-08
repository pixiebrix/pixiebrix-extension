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
  getConstantConditionOrUndefined,
  isApiVersionAtLeast,
} from "./runtimeUtils";
import { toExpression } from "../utils/expressionUtils";

describe("isApiVersionAtLeast()", () => {
  test("v2 is at least v1", () => {
    expect(isApiVersionAtLeast("v2", "v1")).toBe(true);
  });
  test("v2 is at least v2", () => {
    expect(isApiVersionAtLeast("v2", "v2")).toBe(true);
  });
  test("v3 is at least v1", () => {
    expect(isApiVersionAtLeast("v3", "v1")).toBe(true);
  });
  test("v1 is not at least v2", () => {
    expect(isApiVersionAtLeast("v1", "v2")).toBe(false);
  });
});

describe("castConstantCondition", () => {
  it("returns undefined for non-constant conditions", () => {
    expect(
      getConstantConditionOrUndefined(
        toExpression("nunjucks", "{{ @input.foo }}"),
      ),
    ).toBeUndefined();
  });

  it("returns true for truthy string", () => {
    expect(
      getConstantConditionOrUndefined(toExpression("nunjucks", "yes")),
    ).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(getConstantConditionOrUndefined(toExpression("nunjucks", ""))).toBe(
      false,
    );
  });

  it("returns false for falsy string value", () => {
    expect(getConstantConditionOrUndefined("{{ @input.foo }}")).toBe(false);
  });

  it.each([true, false])("returns boolean literal: %s", (value) => {
    expect(getConstantConditionOrUndefined(value)).toBe(value);
  });
});
