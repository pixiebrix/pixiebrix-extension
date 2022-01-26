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

import parseDomTable, { getAllTables } from "./parseDomTable";
import { JSDOM } from "jsdom";

function getTable(
  html: string,
  attributes: Record<string, string> = {}
): HTMLTableElement {
  const table = JSDOM.fragment("<table>" + html)
    .firstElementChild as HTMLTableElement;

  for (const [name, value] of Object.entries(attributes)) {
    table.setAttribute(name, value);
  }

  return table;
}

function getDocument(...elements: Node[]): Document {
  const { window } = new JSDOM();
  window.document.body.append(...elements);
  return window.document;
}

describe("getAllTables", () => {
  test("use caption as name", () => {
    const table1 = getTable(`
      <caption>Characters in Mario 3</caption>
      <tr><th>Name<th>Age
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `);

    const actual = getAllTables(getDocument(table1));

    const expected = new Map([
      ["characters-in-mario-3", parseDomTable(table1)],
    ]);

    expect(actual).toStrictEqual(expected);
  });

  test("use id as name", () => {
    const table1 = getTable(
      `
      <tr><th>Name<th>Age
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `,
      { id: "Characters" }
    );

    const actual = getAllTables(getDocument(table1));

    const expected = new Map([["characters", parseDomTable(table1)]]);

    expect(actual).toStrictEqual(expected);
  });

  test("use aria-label as name", () => {
    const table1 = getTable(
      `
      <tr><th>Name<th>Age
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `,
      { "aria-label": "Characters" }
    );

    const actual = getAllTables(getDocument(table1));

    const expected = new Map([["characters", parseDomTable(table1)]]);

    expect(actual).toStrictEqual(expected);
  });

  test("use aria-describedby as name", () => {
    const table1 = getTable(
      `
      <tr><th>Name<th>Age
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `,
      { "aria-describedby": "other-element" }
    );

    const actual = getAllTables(
      getDocument(
        table1,
        JSDOM.fragment("<p id='other-element'>Characters</p>")
      )
    );

    const expected = new Map([["characters", parseDomTable(table1)]]);

    expect(actual).toStrictEqual(expected);
  });

  test("find multiple unnamed tables", () => {
    const table1 = getTable(`
      <tr><th>Name<th>Age
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `);

    const table2 = getTable(`
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `);

    const actual = getAllTables(getDocument(table1, table2));

    const expected = new Map([
      ["name-age", parseDomTable(table1)],
      ["0-1", parseDomTable(table2)],
    ]);

    expect(actual).toStrictEqual(expected);
  });
});

describe("parseDomTable", () => {
  test("parse simple table", () => {
    const table = getTable(`
      <tr><th>Name<th>Age
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `);

    const expected = {
      fieldNames: ["Name", "Age"],
      records: [
        { Name: "Mario", Age: "42" },
        { Name: "Luigi", Age: "39" },
      ],
    };

    const actual = parseDomTable(table);

    expect(actual).toStrictEqual(expected);
  });

  test("parse header-less table", () => {
    const table = getTable(`
      <tr><td>Mario<td>42
      <tr><td>Luigi<td>39
    `);

    const expected = {
      fieldNames: [0, 1],
      records: [
        { 0: "Mario", 1: "42" },
        { 0: "Luigi", 1: "39" },
      ],
    };

    const actual = parseDomTable(table);

    expect(actual).toStrictEqual(expected);
  });

  test("parse horizontal table", () => {
    const table = getTable(`
      <tr><th>Name<td>Mario<td>Luigi
      <tr><th>Age<td>42<td>39
      <tr><th>Height<td>5' 6"<td>5' 8"
    `);

    const expected = {
      fieldNames: ["Name", "Age", "Height"],
      records: [
        { Name: "Mario", Age: "42", Height: "5' 6\"" },
        { Name: "Luigi", Age: "39", Height: "5' 8\"" },
      ],
    };

    const actual = parseDomTable(table);

    expect(actual).toStrictEqual(expected);
  });
});
