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

import { expandGridRows } from "./GridView";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";

const testRows: Array<InstallableViewItem> = [
  { id: "0" },
  { id: "1" },
  { id: "2" },
  { id: "3" },
  { id: "4" },
  { id: "5" },
];

const groupedTestRows = [
  {
    isGrouped: true,
    subRows: [{ id: "0" }, { id: "1" }, { id: "2" }, { id: "3" }],
  },
  { isGrouped: true, subRows: [{ id: "4" }, { id: "5" }] },
];

describe("expandGridRows", () => {
  test("with divisible column count", () => {
    const divisibleColumnCount = 3; // testRows.length == 6, which is divisible by 3
    const expandedRows = expandGridRows(testRows, divisibleColumnCount);
    const expected = [
      [{ id: "0" }, { id: "1" }, { id: "2" }],
      [{ id: "3" }, { id: "4" }, { id: "5" }],
    ];
    expect(expandedRows).toEqual(expected);
  });

  test("with indivisible column count", () => {
    const indivisible = 4; // testRows.length == 6, which is indivisible by 4
    const expandedRows = expandGridRows(testRows, indivisible);
    const expected = [
      [{ id: "0" }, { id: "1" }, { id: "2" }, { id: "3" }],
      [{ id: "4" }, { id: "5" }],
    ];
    expect(expandedRows).toEqual(expected);
  });

  test("with grouped rows and divisible column count", () => {
    const divisibleColumnCount = 2; // groupedTestRows subRows.length are both divisible by 2
    const expandedRows = expandGridRows(groupedTestRows, divisibleColumnCount);
    const expected = [
      {
        isGrouped: true,
        subRows: [{ id: "0" }, { id: "1" }, { id: "2" }, { id: "3" }],
      },
      [{ id: "0" }, { id: "1" }],
      [{ id: "2" }, { id: "3" }],
      { isGrouped: true, subRows: [{ id: "4" }, { id: "5" }] },
      [{ id: "4" }, { id: "5" }],
    ];
    expect(expandedRows).toEqual(expected);
  });

  test("with grouped rows and indivisible column count", () => {
    const indivisibleColumnCount = 3; // groupedTestRows subRows.length are both indivisible by 3
    const expandedRows = expandGridRows(
      groupedTestRows,
      indivisibleColumnCount
    );
    const expected = [
      {
        isGrouped: true,
        subRows: [{ id: "0" }, { id: "1" }, { id: "2" }, { id: "3" }],
      },
      [{ id: "0" }, { id: "1" }, { id: "2" }],
      [{ id: "3" }],
      { isGrouped: true, subRows: [{ id: "4" }, { id: "5" }] },
      [{ id: "4" }, { id: "5" }],
    ];
    expect(expandedRows).toEqual(expected);
  });

  test("with empty rows", () => {
    const arbitraryColumnCount = 3;
    const expandedRows = expandGridRows([], arbitraryColumnCount);
    expect(expandedRows).toEqual([]);
  });
});
