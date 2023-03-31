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

import { getSheetServiceOutputKey } from "@/contrib/google/sheets/getSheetServiceOutputKey";
import { makeVariableExpression } from "@/runtime/expressionCreators";

describe("getSheetServiceOutputKey", () => {
  test("abc", () => {
    expect(getSheetServiceOutputKey(makeVariableExpression("abc"))).toEqual(
      "abc"
    );
  });
  test("@abc", () => {
    expect(getSheetServiceOutputKey(makeVariableExpression("@abc"))).toEqual(
      "abc"
    );
  });
  test("@abc.def", () => {
    expect(
      getSheetServiceOutputKey(makeVariableExpression("@abc.def"))
    ).toBeUndefined();
  });
  test("@abc.spreadsheetId", () => {
    expect(
      getSheetServiceOutputKey(makeVariableExpression("@abc.spreadsheetId"))
    ).toEqual("abc");
  });
  test("@abc.spreadsheetId.def", () => {
    expect(
      getSheetServiceOutputKey(makeVariableExpression("@abc.spreadsheetId.def"))
    ).toBeUndefined();
  });
  test("@abc.def.spreadsheetId", () => {
    expect(
      getSheetServiceOutputKey(makeVariableExpression("@abc.def.spreadsheetId"))
    ).toBeUndefined();
  });
});
