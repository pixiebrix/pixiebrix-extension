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

import { getOptionsArgForFieldValue } from "@/utils/getOptionsArgForFieldValue";
import { makeVariableExpression } from "@/runtime/expressionCreators";

describe("getOptionsArgForFieldValue", () => {
  it("returns null when optionsArgs is empty", () => {
    expect(getOptionsArgForFieldValue("foo", {})).toBeNull();
  });

  it("returns null when fieldValue is not a var expression", () => {
    expect(getOptionsArgForFieldValue("foo", { foo: "bar" })).toBeNull();
  });

  it("returns null when fieldValue is not an options var expression", () => {
    expect(
      getOptionsArgForFieldValue(makeVariableExpression("@foo"), { foo: "bar" })
    ).toBeNull();
  });

  it("returns null when fieldValue is an options var expression but the key is empty", () => {
    expect(
      getOptionsArgForFieldValue(makeVariableExpression("@options."), {
        foo: "bar",
      })
    ).toBeNull();
  });

  it("returns null when fieldValue is an options var expression but the key is not in optionsArgs", () => {
    expect(
      getOptionsArgForFieldValue(makeVariableExpression("@options.foo"), {
        bar: "baz",
      })
    ).toBeNull();
  });

  it("returns the value from optionsArgs when fieldValue is an options var expression and the key is in optionsArgs", () => {
    expect(
      getOptionsArgForFieldValue(makeVariableExpression("@options.foo"), {
        foo: "bar",
      })
    ).toBe("bar");
  });
});
