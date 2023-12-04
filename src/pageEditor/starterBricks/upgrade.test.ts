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

import {
  isUpgradeableString,
  upgradePipelineToV3,
  upgradeStringToExpression,
} from "@/pageEditor/starterBricks/upgrade";
import blockRegistry from "@/bricks/registry";
import { BrickABC } from "@/types/brickTypes";
import { propertiesToSchema } from "@/validators/generic";
import { type Schema } from "@/types/schemaTypes";
import { type RegistryId } from "@/types/registryTypes";
import { toExpression } from "@/utils/expressionUtils";

beforeEach(() => {
  blockRegistry.clear();
});

function defineBlock(schema: Schema): RegistryId {
  class DefinedBlock extends BrickABC {
    constructor() {
      super("test/block", "Test Brick");
    }

    inputSchema = schema;

    async run() {
      return {};
    }
  }

  const block = new DefinedBlock();

  blockRegistry.register([block]);

  return block.id;
}

describe("upgradePipelineToV3 tests", () => {
  test.each([["string"], ["boolean"], ["number"]])(
    "upgrade %s var",
    async (type) => {
      const id = defineBlock(
        propertiesToSchema({
          prop: {
            type: type as any,
          },
        }),
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
            prop: toExpression("var", "@foo"),
          },
        },
      ]);
    },
  );

  test("upgrade literals", async () => {
    const id = defineBlock(
      propertiesToSchema({
        booleanProp: {
          type: "boolean",
        },
        numberProp: {
          type: "number",
        },
      }),
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

  test("upgrade conditional", async () => {
    const id = defineBlock(propertiesToSchema({}));

    const upgraded = await upgradePipelineToV3([
      { id, config: {}, if: "@foo" },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {},
        if: toExpression("var", "@foo"),
      },
    ]);
  });

  test("upgrade nunjucks conditional", async () => {
    const id = defineBlock(propertiesToSchema({}));

    const upgraded = await upgradePipelineToV3([
      { id, config: {}, if: "{{ @foo }}", templateEngine: "nunjucks" },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id,
        config: {},
        if: toExpression("nunjucks", "{{ @foo }}"),
      },
    ]);
  });

  test("ignore selector", async () => {
    const id = defineBlock(
      propertiesToSchema({
        selector: {
          type: "string",
          format: "selector",
        },
      }),
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

  test("nested object", async () => {
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
      }),
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
            childString: toExpression("mustache", "{{ @input.foo }}"),
          },
        },
      },
    ]);
  });

  test("nested object with additionalProperties", async () => {
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
            childString: toExpression("mustache", "{{ @input.foo }}"),
          },
        },
      },
    ]);
  });

  test("nested object with additionalProperties ignores selector", async () => {
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

  test("nested object with additionalProperties and oneOf", async () => {
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
            childString: toExpression("mustache", "{{ @input.foo }}"),
            childObject: {
              foo: toExpression("mustache", "{{ @input.bar }}"),
              bar: 42,
            },
          },
        },
      },
    ]);
  });

  test("nested object with additionalProperties and oneOf ignores selector", async () => {
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

  test("nested array", async () => {
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
      }),
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
              itemString: toExpression("mustache", "{{ @input.foo }}"),
            },
          ],
        },
      },
    ]);
  });

  test("nested array with items array", async () => {
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
      }),
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
            toExpression("mustache", "myInputString"),
            {
              itemString: toExpression("mustache", "{{ @input.foo }}"),
            },
          ],
        },
      },
    ]);
  });

  test("nested array with items array and additionalItems", async () => {
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
      }),
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
              itemString: toExpression("mustache", "{{ @input.foo }}"),
            },
            toExpression("mustache", "foo"),
            toExpression("mustache", "bar"),
          ],
        },
      },
    ]);
  });

  test("nested array with additionalItems and oneOf", async () => {
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
      }),
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
            toExpression("mustache", "two"),
            3,
            toExpression("mustache", "four"),
          ],
        },
      },
    ]);
  });
});

describe("upgrade overrides", () => {
  test("append to google sheets as object", async () => {
    // Import dynamically to avoid circular dependence
    const { GoogleSheetsAppend } = await import(
      "@/contrib/google/sheets/bricks/append"
    );

    const block = new GoogleSheetsAppend();
    blockRegistry.register([block]);

    const upgraded = await upgradePipelineToV3([
      {
        id: block.id,
        config: {
          spreadsheetId: "12345",
          tabName: "tab name",
          rowValues: {
            literal: "literal",
            variable: "@variable",
            template: "{{ @template }}",
          },
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id: block.id,
        config: {
          spreadsheetId: "12345",
          tabName: "tab name",
          rowValues: {
            // This is not a special-cased field, so it gets converted
            literal: toExpression("mustache", "literal"),
            variable: toExpression("var", "@variable"),
            template: toExpression("mustache", "{{ @template }}"),
          },
        },
      },
    ]);
  });

  test("append to google sheets as array", async () => {
    // Import dynamically to avoid circular dependence
    const { GoogleSheetsAppend } = await import(
      "@/contrib/google/sheets/bricks/append"
    );

    const block = new GoogleSheetsAppend();
    blockRegistry.register([block]);

    const upgraded = await upgradePipelineToV3([
      {
        id: block.id,
        config: {
          spreadsheetId: "12345",
          tabName: "tab name",
          rowValues: [
            {
              literal: "literal",
              variable: "@variable",
              template: "{{ @template }}",
            },
          ],
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id: block.id,
        config: {
          spreadsheetId: "12345",
          tabName: "tab name",
          rowValues: [
            {
              // This is not a special-cased field, so it gets converted
              literal: toExpression("mustache", "literal"),
              variable: toExpression("var", "@variable"),
              template: toExpression("mustache", "{{ @template }}"),
            },
          ],
        },
      },
    ]);
  });

  test("don't convert framework to expression", async () => {
    // Import dynamically to avoid circular dependence
    const { ComponentReader } = await import(
      "@/bricks/transformers/component/ComponentReader"
    );

    const block = new ComponentReader();
    blockRegistry.register([block]);

    const upgraded = await upgradePipelineToV3([
      {
        id: block.id,
        config: {
          framework: "react",
          selector: "body",
        },
      },
    ]);

    expect(upgraded).toStrictEqual([
      {
        id: block.id,
        config: {
          framework: "react",
          // Don't convert because it's a selector
          selector: "body",
        },
      },
    ]);
  });
});

describe("upgradeStringToExpression tests", () => {
  test("convert var to expression", () => {
    expect(upgradeStringToExpression("@foo", "mustache")).toStrictEqual(
      toExpression("var", "@foo"),
    );
  });

  test("convert var to mustache", () => {
    expect(upgradeStringToExpression("{{ @foo }}", "mustache")).toStrictEqual(
      toExpression("mustache", "{{ @foo }}"),
    );
  });
});

describe("isTemplateString", () => {
  test.each([["@input.foo"], ["@outputKey"]])(
    "detects variable: %s",
    (value: string) => {
      expect(isUpgradeableString(value)).toBe(true);
    },
  );

  test.each([
    ["{{ @input.foo }}!!"],
    ["{{ & @outputKey }}!!"],
    ["{% if @outputKey %}foo{% endif %}"],
  ])("detects variable: %s", (value: string) => {
    expect(isUpgradeableString(value)).toBe(true);
  });
});
