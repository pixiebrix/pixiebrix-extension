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

import {
  parseDefinitionList,
  getAllDefinitionLists,
} from "./parseDefinitionList";
import { JSDOM } from "jsdom";
import { html } from "@/utils";

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

function getDocument(html: string): Document {
  const { window } = new JSDOM();
  window.document.body.innerHTML = html;
  return window.document;
}

describe("parseDefinitionList", () => {
  test("parse simple list", () => {
    const list = getDL(html`
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
    const list = getDL(html`
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
    const list = getDL(html`
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

describe("getAllDefinitionLists", () => {
  test("find multiple unnamed lists", () => {
    const document = getDocument(html`
      <dl>
        <dt>bloke</dt>
        <dd>man</dd>

        <dt>lad</dt>
        <dd>young man</dd>

        <dt>bird</dt>
        <dd>girl or woman</dd>
      </dl>
      <dl>
        <dt>mental</dt>
        <dt>bonkers</dt>
        <dd>mad</dd>
        <dd>crazy</dd>

        <dt>daft</dt>
        <dd>silly</dd>
      </dl>
    `);

    expect(getAllDefinitionLists(document)).toMatchInlineSnapshot(`
      Map {
        "table_2c6a1" => Object {
          "fieldNames": Array [
            "bloke",
            "lad",
            "bird",
          ],
          "records": Array [
            Object {
              "bird": "girl or woman",
              "bloke": "man",
              "lad": "young man",
            },
          ],
        },
        "table_4e8c8" => Object {
          "fieldNames": Array [
            "mental",
            "bonkers",
            "daft",
          ],
          "records": Array [
            Object {
              "bonkers": "mad
      crazy",
              "daft": "silly",
              "mental": "mad
      crazy",
            },
          ],
        },
      }
    `);
  });

  test("use id as name", () => {
    const document = getDocument(html`
      <dl id="british-money-slang">
        <dt>quid</dt>
        <dd>British pound</dd>

        <dt>fiver</dt>
        <dd>5 British pounds</dd>

        <dt>tenner</dt>
        <dd>10 British pounds</dd>
      </dl>
    `);

    expect(getAllDefinitionLists(document)).toMatchInlineSnapshot(`
      Map {
        "british-money-slang" => Object {
          "fieldNames": Array [
            "quid",
            "fiver",
            "tenner",
          ],
          "records": Array [
            Object {
              "fiver": "5 British pounds",
              "quid": "British pound",
              "tenner": "10 British pounds",
            },
          ],
        },
      }
    `);
  });

  test("use aria-label as name", () => {
    const document = getDocument(html`
      <dl aria-label="british-slang">
        <dt>gobsmacked</dt>
        <dd>shocked</dd>

        <dt>dodgy</dt>
        <dd>sketchy</dd>
      </dl>
    `);

    expect(getAllDefinitionLists(document)).toMatchInlineSnapshot(`
      Map {
        "british-slang" => Object {
          "fieldNames": Array [
            "gobsmacked",
            "dodgy",
          ],
          "records": Array [
            Object {
              "dodgy": "sketchy",
              "gobsmacked": "shocked",
            },
          ],
        },
      }
    `);
  });

  test("use aria-describedby as name", () => {
    const document = getDocument(html`
      <dl aria-describedby="other-element">
        <dt>kerfuffle</dt>
        <dd>fuss</dd>
        <dt>innit</dt>
        <dd>isn't it</dd>
      </dl>
      <p id="other-element">Funny british terms</p>
    `);

    expect(getAllDefinitionLists(document)).toMatchInlineSnapshot(`
      Map {
        "funny_british_terms" => Object {
          "fieldNames": Array [
            "kerfuffle",
            "innit",
          ],
          "records": Array [
            Object {
              "innit": "isn't it",
              "kerfuffle": "fuss",
            },
          ],
        },
      }
    `);
  });
});
