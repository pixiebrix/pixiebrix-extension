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

import {
  stringToExpression,
  upgradePipelineToV3,
} from "@/devTools/editor/extensionPoints/upgrade";
import blockRegistry from "@/blocks/registry";
import { RegistryId, Schema } from "@/core";
import { Block } from "@/types";
import { propertiesToSchema } from "@/validators/generic";

beforeEach(() => {
  blockRegistry.clear();
});

function defineBlock(schema: Schema): RegistryId {
  class DefinedBlock extends Block {
    constructor() {
      super("test/block", "Test Block");
    }

    inputSchema = schema;

    async run() {
      return {};
    }
  }

  const block = new DefinedBlock();

  blockRegistry.register(block);

  return block.id;
}

describe("stringToExpression tests", () => {
  test("convert var to expression", () => {
    expect(stringToExpression("@foo", "mustache")).toStrictEqual({
      __type__: "var",
      __value__: "@foo",
    });
  });

  test("convert var to mustache", () => {
    expect(stringToExpression("{{ @foo }}", "mustache")).toStrictEqual({
      __type__: "mustache",
      __value__: "{{ @foo }}",
    });
  });
});

describe("upgradePipelineToV3 tests", () => {
  test.each([["string"], ["boolean"], ["number"]])(
    "test upgrade %s var",
    async (type) => {
      const id = defineBlock(
        propertiesToSchema({
          prop: {
            type: type as any,
          },
        })
      );

      const upgraded = await upgradePipelineToV3([
        {
          id,
          config: {
            prop: "@foo",
          },
        },
      ]);

      expect(upgraded).toStrictEqual([
        {
          id,
          config: {
            prop: {
              __type__: "var",
              __value__: "@foo",
            },
          },
        },
      ]);
    }
  );

  test("test upgrade literals", async () => {
    const id = defineBlock(
      propertiesToSchema({
        booleanProp: {
          type: "boolean",
        },
        numberProp: {
          type: "number",
        },
      })
    );

    const config = {
      booleanProp: true,
      numberProp: 42,
    };

    const upgraded = await upgradePipelineToV3([{ id, config }]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config,
      },
    ]);
  });

  test("test upgrade conditional", async () => {
    const id = defineBlock(propertiesToSchema({}));

    const upgraded = await upgradePipelineToV3([
      { id, config: {}, if: "@foo" },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {},
        if: {
          __type__: "var",
          __value__: "@foo",
        },
      },
    ]);
  });

  test("test upgrade nunjucks conditional", async () => {
    const id = defineBlock(propertiesToSchema({}));

    const upgraded = await upgradePipelineToV3([
      { id, config: {}, if: "{{ @foo }}", templateEngine: "nunjucks" },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {},
        if: {
          __type__: "nunjucks",
          __value__: "{{ @foo }}",
        },
      },
    ]);
  });

  test("test ignore selector", async () => {
    const id = defineBlock(
      propertiesToSchema({
        selector: {
          type: "string",
          format: "selector",
        },
      })
    );

    const config = {
      selector: "#home",
    };

    const upgraded = await upgradePipelineToV3([{ id, config }]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config,
      },
    ]);
  });

  test("test nested object", async () => {
    const id = defineBlock(
      propertiesToSchema({
        parent: {
          type: "object",
          properties: {
            childString: {
              type: "string",
            },
          },
        },
      })
    );

    const upgraded = await upgradePipelineToV3([
      {
        id,
        config: {
          parent: {
            childString: "{{ @input.foo }}",
          },
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {
          parent: {
            childString: {
              __type__: "mustache",
              __value__: "{{ @input.foo }}",
            },
          },
        },
      },
    ]);
  });

  test("test nested object with additionalProperties", async () => {
    const id = defineBlock({
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {
        parent: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
        },
      },
    });

    const upgraded = await upgradePipelineToV3([
      {
        id,
        config: {
          parent: {
            childString: "{{ @input.foo }}",
          },
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {
          parent: {
            childString: {
              __type__: "mustache",
              __value__: "{{ @input.foo }}",
            },
          },
        },
      },
    ]);
  });

  test("test nested object with additionalProperties ignores selector", async () => {
    const id = defineBlock({
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {
        parent: {
          type: "object",
          additionalProperties: {
            type: "string",
            format: "selector",
          },
        },
      },
    });

    const pipeline = [
      {
        id,
        config: {
          parent: {
            name: "h1.name",
          },
        },
      },
    ];

    const upgraded = await upgradePipelineToV3(pipeline);

    expect(upgraded).toStrictEqual(pipeline);
  });

  test("test nested object with additionalProperties and oneOf", async () => {
    const id = defineBlock({
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {
        parent: {
          type: "object",
          additionalProperties: {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "object",
                properties: {
                  foo: {
                    type: "string",
                  },
                  bar: {
                    type: "number",
                  },
                },
              },
            ],
          },
        },
      },
    });

    const upgraded = await upgradePipelineToV3([
      {
        id,
        config: {
          parent: {
            childString: "{{ @input.foo }}",
            childObject: {
              foo: "{{ @input.bar }}",
              bar: 42,
            },
          },
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {
          parent: {
            childString: {
              __type__: "mustache",
              __value__: "{{ @input.foo }}",
            },
            childObject: {
              foo: {
                __type__: "mustache",
                __value__: "{{ @input.bar }}",
              },
              bar: 42,
            },
          },
        },
      },
    ]);
  });

  test("test nested object with additionalProperties and oneOf ignores selector", async () => {
    const id = defineBlock({
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      additionalProperties: {
        oneOf: [
          {
            type: "string",
            format: "selector",
          },
          {
            type: "object",
            properties: {
              foo: {
                type: "string",
              },
              bar: {
                type: "number",
              },
            },
          },
        ],
      },
    });

    const pipeline = [
      {
        id,
        config: {
          parent: {
            name: "h1.name",
          },
        },
      },
    ];

    const upgraded = await upgradePipelineToV3(pipeline);

    expect(upgraded).toStrictEqual(pipeline);
  });

  test("test nested array", async () => {
    const id = defineBlock(
      propertiesToSchema({
        parent: {
          type: "array",
          items: {
            type: "object",
            properties: {
              itemString: {
                type: "string",
              },
            },
          },
        },
      })
    );

    const upgraded = await upgradePipelineToV3([
      {
        id,
        config: {
          parent: [{ itemString: "{{ @input.foo }}" }],
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {
          parent: [
            {
              itemString: {
                __type__: "mustache",
                __value__: "{{ @input.foo }}",
              },
            },
          ],
        },
      },
    ]);
  });

  test("test nested array with items array", async () => {
    const id = defineBlock(
      propertiesToSchema({
        parent: {
          type: "array",
          items: [
            {
              type: "string",
            },
            {
              type: "object",
              properties: {
                itemString: {
                  type: "string",
                },
              },
            },
          ],
        },
      })
    );

    const upgraded = await upgradePipelineToV3([
      {
        id,
        config: {
          parent: [
            "myInputString",
            {
              itemString: "{{ @input.foo }}",
            },
          ],
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {
          parent: [
            {
              __type__: "mustache",
              __value__: "myInputString",
            },
            {
              itemString: {
                __type__: "mustache",
                __value__: "{{ @input.foo }}",
              },
            },
          ],
        },
      },
    ]);
  });

  test("test nested array with items array and additionalItems", async () => {
    const id = defineBlock(
      propertiesToSchema({
        parent: {
          type: "array",
          items: [
            {
              type: "object",
              properties: {
                itemString: {
                  type: "string",
                },
              },
            },
          ],
          additionalItems: {
            type: "string",
          },
        },
      })
    );

    const upgraded = await upgradePipelineToV3([
      {
        id,
        config: {
          parent: [
            {
              itemString: "{{ @input.foo }}",
            },
            "foo",
            "bar",
          ],
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {
          parent: [
            {
              itemString: {
                __type__: "mustache",
                __value__: "{{ @input.foo }}",
              },
            },
            {
              __type__: "mustache",
              __value__: "foo",
            },
            {
              __type__: "mustache",
              __value__: "bar",
            },
          ],
        },
      },
    ]);
  });

  test("test nested array with additionalItems and oneOf", async () => {
    const id = defineBlock(
      propertiesToSchema({
        parent: {
          type: "array",
          additionalItems: {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "number",
              },
            ],
          },
        },
      })
    );

    const upgraded = await upgradePipelineToV3([
      {
        id,
        config: {
          parent: [1, "two", 3, "four"],
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {
          parent: [
            1,
            {
              __type__: "mustache",
              __value__: "two",
            },
            3,
            {
              __type__: "mustache",
              __value__: "four",
            },
          ],
        },
      },
    ]);
  });
});
