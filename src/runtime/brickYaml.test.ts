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
import { loadBrickYaml, dumpBrickYaml } from "@/runtime/brickYaml";

describe("loadYaml", () => {
  test("deserialize var", async () => {
    expect(loadBrickYaml("foo: !var a.b.c")).toEqual({
      foo: {
        __type__: "var",
        __value__: "a.b.c",
      },
    });
  });

  test("deserialize mustache", async () => {
    expect(loadBrickYaml("foo: !mustache '{{ a.b.c }}!'")).toEqual({
      foo: {
        __type__: "mustache",
        __value__: "{{ a.b.c }}!",
      },
    });
  });

  test("deserialize pipeline", async () => {
    expect(
      loadBrickYaml("foo: !pipeline\n  - id: '@pixiebrix/confetti'")
    ).toEqual({
      foo: {
        __type__: "pipeline",
        __value__: [{ id: "@pixiebrix/confetti" }],
      },
    });
  });

  test("deserialize defer", async () => {
    expect(
      loadBrickYaml("foo: !defer\n  bar: !mustache '{{ @element }}'")
    ).toEqual({
      foo: {
        __type__: "defer",
        __value__: {
          bar: {
            __type__: "mustache",
            __value__: "{{ @element }}",
          },
        },
      },
    });
  });
});

describe("dumpYaml", () => {
  test("serialize var", () => {
    const dumped = dumpBrickYaml({
      foo: {
        __type__: "var",
        __value__: "a.b.c",
      },
    });

    expect(dumped).toBe("foo: !var a.b.c\n");
  });

  test("serialize pipeline", () => {
    const dumped = dumpBrickYaml({
      foo: {
        __type__: "pipeline",
        __value__: [{ id: "@pixiebrix/confetti" }],
      },
    });

    expect(dumped).toBe("foo: !pipeline \n  - id: '@pixiebrix/confetti'\n");
  });

  test("serialize defer", () => {
    const dumped = dumpBrickYaml({
      foo: {
        __type__: "defer",
        __value__: { bar: 42 },
      },
    });

    expect(dumped).toBe("foo: !defer \n  bar: 42\n");
  });

  test("strips sharing information", () => {
    const dumped = dumpBrickYaml({
      metadata: {
        id: "test/brick",
        sharing: {
          foo: 42,
        },
      },
      sharing: {
        foo: 42,
      },
    });

    expect(dumped).toBe("metadata:\n  id: test/brick\n");
  });

  test("strips updated_at", () => {
    const dumped = dumpBrickYaml({
      metadata: {
        id: "test/brick",
        updated_at: "2021-11-18T00:00:00.000000Z",
      },
      updated_at: "2021-11-18T00:00:00.000000Z",
    });

    expect(dumped).toBe("metadata:\n  id: test/brick\n");
  });
});

describe("parse/dump document", () => {
  const brick1 = [
    `
id: '@test/document'
config:
  body:
    - type: header_1
      config:
        title: !var '@data.header'
    - type: list
      config:
        element: !defer
          type: text
          config:
            text: List item text.
        array: !var '@data.items'`,
    /*
    - type: card
      config:
        heading: !var '@card.name'
      children:
        - type: block
          config:
            pipeline: !pipeline
              - id: '@pixiebrix/markdown'
                config:
                  markdown: 'Markdown content.'
*/

    {
      id: "@test/document",
      config: {
        body: [
          {
            type: "header_1",
            config: {
              title: {
                __type__: "var",
                __value__: "@data.header",
              },
            },
          },
          {
            type: "list",
            config: {
              element: {
                __type__: "defer",
                __value__: {
                  type: "text",
                  config: {
                    text: "List item text.",
                  },
                },
              },
              array: {
                __type__: "var",
                __value__: "@data.items",
              },
            },
          },
          // {
          //   type: "card",
          //   config: {
          //     heading: {
          //       __type__: "var",
          //       __value__: "@card.name",
          //     },
          //   },
          //   children: [
          //     {
          //       type: "block",
          //       config: {
          //         pipeline: {
          //           __type__: "pipeline",
          //           __values__: {
          //             id: "@pixiebrix/markdown",
          //             config: {
          //               markdown: "Markdown content.",
          //             },
          //           },
          //         },
          //       },
          //     },
          //   ],
          // },
        ],
      },
    },
  ];

  const brick2 = [
    `
kind: recipe
metadata:
  id: '@balehok/side-panel-test'
  version: 1.0.0
  name: My habr.com side panel WS
  description: Custom stuff available in WS only.
apiVersion: v3
definitions:
  extensionPoint:
    kind: extensionPoint
    definition:
      type: actionPanel
      reader:
        - '@pixiebrix/document-metadata'
      isAvailable:
        matchPatterns:
          - https://habr.com/*
        urlPatterns: []
        selectors: []
extensionPoints:
  - id: extensionPoint
    label: My habr.com side panel
    config:
      heading: Workshop
      body:
        - id: '@pixiebrix/jquery-reader'
          config:
            selectors:
              header: h1
              titles:
                multi: true
                selector: '[data-article-link] span'
              className: .tm-tabs__tab-link[href='\\/en\\/companies\\/']
              firstArticle: >-
                [data-article-link][href='\\/en\\/company\\/pvs-studio\\/blog\\/592213\\/']
                span
          outputKey: data
        - id: '@pixiebrix/get'
          config:
            url: https://api.publicapis.org/categories
          outputKey: response
        - id: '@pixiebrix/document'
          config:
            body:
              - type: card
                config:
                  heading: !nunjucks jQuery ({{@data.titles | length}})
                children:
                  - type: list
                    config:
                      element: !defer
                        type: text
                        config:
                          text: Paragraph text.
                      array: !var '@data.titles'
              - type: card
                config:
                  heading: !nunjucks API ({{@response | length}})
                children: []
    services: {}
`,
    {
      kind: "recipe",
      metadata: {
        id: "@balehok/side-panel-test",
        version: "1.0.0",
        name: "My habr.com side panel WS",
        description: "Custom stuff available in WS only.",
      },
      apiVersion: "v3",
      definitions: {
        extensionPoint: {
          kind: "extensionPoint",
          definition: {
            type: "actionPanel",
            reader: ["@pixiebrix/document-metadata"],
            isAvailable: {
              matchPatterns: ["https://habr.com/*"],
              urlPatterns: [] as any[],
              selectors: [] as any[],
            },
          },
        },
      },
      extensionPoints: [
        {
          id: "extensionPoint",
          label: "My habr.com side panel",
          config: {
            heading: "Workshop",
            body: [
              {
                id: "@pixiebrix/jquery-reader",
                config: {
                  selectors: {
                    header: "h1",
                    titles: {
                      multi: true,
                      selector: "[data-article-link] span",
                    },
                    className:
                      ".tm-tabs__tab-link[href='\\/en\\/companies\\/']",
                    firstArticle:
                      "[data-article-link][href='\\/en\\/company\\/pvs-studio\\/blog\\/592213\\/'] span",
                  },
                },
                outputKey: "data",
              },
              {
                id: "@pixiebrix/get",
                config: {
                  url: "https://api.publicapis.org/categories",
                },
                outputKey: "response",
              },
              {
                id: "@pixiebrix/document",
                config: {
                  body: [
                    {
                      type: "card",
                      config: {
                        heading: {
                          __type__: "nunjucks",
                          __value__: "jQuery ({{@data.titles | length}})",
                        },
                      },
                      children: [
                        {
                          type: "list",
                          config: {
                            element: {
                              __type__: "defer",
                              __value__: {
                                type: "text",
                                config: {
                                  text: "Paragraph text.",
                                },
                              },
                            },
                            array: {
                              __type__: "var",
                              __value__: "@data.titles",
                            },
                          },
                        },
                      ],
                    },
                    {
                      type: "card",
                      config: {
                        heading: {
                          __type__: "nunjucks",
                          __value__: "API ({{@response | length}})",
                        },
                      },
                      children: [],
                    },
                  ],
                },
              },
            ],
          },
          services: {},
        },
      ],
    },
  ];

  test.each([brick1, brick2])(
    "serialize document",
    (brickYaml: string, brickJson: any) => {
      expect(dumpBrickYaml(brickJson)).toBe(brickYaml);
    }
  );

  test.each([brick1, brick2])(
    "deserealize document",
    async (brickYaml: string, brickJson: any) => {
      expect(loadBrickYaml(brickYaml)).toEqual(brickJson);
    }
  );
});
