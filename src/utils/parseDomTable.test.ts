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

import parseDomTable from "./parseDomTable";
import { JSDOM } from "jsdom";

function getTable(html: string): HTMLTableElement {
  return JSDOM.fragment("<table>" + html).firstElementChild as HTMLTableElement;
}

describe("parseDomTable", () => {
  test("parse simple table", () => {
    const table = getTable(`
      <tr><th>Name<th>Age
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `);

    const expected = [
      { Name: "Mario", Age: "42" },
      { Name: "Luigi", Age: "39" },
    ];

    const actual = parseDomTable(table);

    expect(actual).toStrictEqual(expected);
  });

  test("parse header-less table", () => {
    const table = getTable(`
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `);

    const expected = [
      { 0: "Mario", 1: "42" },
      { 0: "Luigi", 1: "39" },
    ];

    const actual = parseDomTable(table);

    expect(actual).toStrictEqual(expected);
  });

  test("parse horizontal table", () => {
    const table = getTable(`
      <tr><th>Name<td>Mario<td>Luigi
      <tr><th>Age<td>42<td>39
      <tr><th>Height<td>5' 6"<td>5' 8"
    `);

    const expected = [
      { Name: "Mario", Age: "42", Height: "5' 6\"" },
      { Name: "Luigi", Age: "39", Height: "5' 8\"" },
    ];

    const actual = parseDomTable(table);

    expect(actual).toStrictEqual(expected);
  });
});
