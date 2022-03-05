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

import { parseDefinitionList } from "./parseDefinitionList";
import { JSDOM } from "jsdom";

function getDL(
  html: string,
  attributes: Record<string, string> = {}
): HTMLDListElement {
  const list = JSDOM.fragment("<dl>" + html)
    .firstElementChild as HTMLDListElement;

  for (const [name, value] of Object.entries(attributes)) {
    list.setAttribute(name, value);
  }

  return list;
}

describe("parseDefinitionList", () => {
  test("parse simple list", () => {
    const list = getDL(`
      <dt>YOLO</dt>
        <dd>You Only Live Once</dd>
      <dt>SMH</dt>
        <dd>Shaking My Head</dd>
    `);

    expect(parseDefinitionList(list)).toMatchInlineSnapshot(`
      Object {
        "fieldNames": Array [
          "YOLO",
          "SMH",
        ],
        "records": Array [
          Object {
            "SMH": "Shaking My Head",
            "YOLO": "You Only Live Once",
          },
        ],
      }
    `);
  });

  test("parse list with multiple definitions and terms", () => {
    const list = getDL(`
      <dt>sup</dt>
      <dt>wassup</dt>
        <dd>What is up</dd>
        <dd>Hello</dd>
      <dt>lol</dt>
        <dd>Laughing Out Loud</dd>
    `);

    expect(parseDefinitionList(list)).toMatchInlineSnapshot(`
      Object {
        "fieldNames": Array [
          "sup",
          "wassup",
          "lol",
        ],
        "records": Array [
          Object {
            "lol": "Laughing Out Loud",
            "sup": "What is up
      Hello",
            "wassup": "What is up
      Hello",
          },
        ],
      }
    `);
  });

  test("parse list wrapped in divs", () => {
    const list = getDL(`
      <div>
        <dt>sus</dt>
          <dd>Suspicious</dd>
      </div>
      <div>
        <dt>lit</dt>
        <dt>bussin</dt>
          <dd>Amazing</dd>
      </div>
    `);

    expect(parseDefinitionList(list)).toMatchInlineSnapshot(`
      Object {
        "fieldNames": Array [
          "sus",
          "lit",
          "bussin",
        ],
        "records": Array [
          Object {
            "bussin": "Amazing",
            "lit": "Amazing",
            "sus": "Suspicious",
          },
        ],
      }
    `);
  });
});
