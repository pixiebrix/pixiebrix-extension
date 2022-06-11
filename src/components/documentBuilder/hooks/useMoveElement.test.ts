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
  arrayMove,
  moveElement,
} from "@/components/documentBuilder/hooks/useMoveElement";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";

const data = {
  id: "@pixiebrix/document",
  config: {
    body: [
      {
        type: "container",
        config: {},
        children: [
          {
            type: "row",
            config: {},
            children: [
              {
                type: "column",
                config: {},
                children: [
                  {
                    type: "header_1",
                    config: {
                      title: {
                        __type__: "nunjucks",
                        __value__: "Sidebar #2",
                      },
                    },
                  },
                ],
              },
            ],
          },
          {
            type: "row",
            config: {},
            children: [
              {
                type: "column",
                config: {},
                children: [
                  {
                    type: "text",
                    config: {
                      text: {
                        __type__: "nunjucks",
                        __value__: "{{@input.url}} - API: {{@response.code}}",
                      },
                      className: "text-success",
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("arrayMove", () => {
  test("move earlier", () => {
    const original = [1, 2, 3];
    const copy = [...original];
    arrayMove(copy, 1, 0);
    expect(copy).toStrictEqual([2, 1, 3]);
  });

  test("move later", () => {
    const original = [1, 2, 3];
    const copy = [...original];
    arrayMove(copy, 0, 1);
    expect(copy).toStrictEqual([2, 1, 3]);
  });
});

describe("moveElement", () => {
  test("can move element between rows", () => {
    const result = moveElement(
      data.config.body as DocumentElement[],
      {
        parentId: "0.children.1.children.0",
        index: 0,
      },
      {
        parentId: "0.children.0.children.0",
        index: 0,
      }
    );

    expect(result[0].children[0].children[0].children).toHaveLength(2);
    expect(result[0].children[1].children).toHaveLength(1);
  });

  test("can move elements earlier in container", () => {
    const original = data.config.body as DocumentElement[];

    const result = moveElement(
      original,
      {
        parentId: "0",
        index: 1,
      },
      {
        parentId: "0",
        index: 0,
      }
    );

    expect(result[0].children).toHaveLength(2);
    expect(result[0].children[0]).toStrictEqual(original[0].children[1]);
    expect(result[0].children[1]).toStrictEqual(original[0].children[0]);
  });

  test("can move elements later in container", () => {
    const result = moveElement(
      data.config.body as DocumentElement[],
      {
        parentId: "0",
        index: 0,
      },
      {
        parentId: "0",
        index: 1,
      }
    );

    expect(result[0].children).toHaveLength(2);
  });
});
