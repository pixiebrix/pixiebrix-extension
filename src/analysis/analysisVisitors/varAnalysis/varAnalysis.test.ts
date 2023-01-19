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
  blockConfigFactory,
  formStateFactory,
  installedRecipeMetadataFactory,
  recipeFactory,
} from "@/testUtils/factories";
import VarAnalysis from "./varAnalysis";
import { validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import IfElse from "@/blocks/transformers/controlFlow/IfElse";
import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import {
  makePipelineExpression,
  makeTemplateExpression,
} from "@/runtime/expressionCreators";
import { EchoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import recipeRegistry from "@/recipes/registry";
import blockRegistry from "@/blocks/registry";
import { SELF_EXISTENCE, VarExistence } from "./varMap";
import { Schema } from "@/core";

jest.mock("@/background/messenger/api", () => ({
  __esModule: true,
  services: {
    locate: jest.fn().mockResolvedValue({
      serviceId: "@test/service",
    }),
  },
}));

jest.mock("@/blocks/registry", () => ({
  __esModule: true,
  default: {
    lookup: jest.fn().mockResolvedValue({
      outputSchema: {
        properties: {
          title: "Test",
          url: "https://example.com",
          lang: "en",
        },
      },
    }),
    allTyped: jest.fn().mockResolvedValue(new Map()),
  },
}));

jest.mock("@/recipes/registry", () => ({
  __esModule: true,
  default: {
    lookup: jest.fn(),
  },
}));

describe("Collecting available vars", () => {
  function mockBlueprintWithOptions(optionsSchema: any) {
    (recipeRegistry.lookup as jest.Mock).mockResolvedValue(
      recipeFactory({
        options: {
          schema: optionsSchema,
        },
      })
    );
  }

  let analysis: VarAnalysis;
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("general", () => {
    beforeEach(() => {
      analysis = new VarAnalysis([]);
    });

    test("collects the context vars", async () => {
      mockBlueprintWithOptions({
        properties: {
          foo: {
            type: "string",
          },
        },
      });

      const extension = formStateFactory(
        {
          // Let this extension to have a service reference
          services: [
            {
              outputKey: validateOutputKey("pixiebrix"),
              id: validateRegistryId("@test/service"),
            },
          ],
          optionsArgs: {
            foo: "bar",
          },
          recipe: installedRecipeMetadataFactory({
            id: validateRegistryId("test/recipe"),
          }),
        },
        [blockConfigFactory()]
      );

      await analysis.run(extension);

      const knownVars = analysis.getKnownVars();
      expect(knownVars.size).toBe(1);

      const foundationKnownVars = knownVars.get("extension.blockPipeline.0");

      expect(foundationKnownVars.isVariableDefined("@input.title")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@input.url")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@input.lang")).toBeTrue();

      expect(foundationKnownVars.isVariableDefined("@options.foo")).toBeTrue();

      expect(
        foundationKnownVars.isVariableDefined("@pixiebrix.__service.serviceId")
      ).toBeTrue();
    });

    test("collects the output key", async () => {
      const extension = formStateFactory(undefined, [
        blockConfigFactory({
          outputKey: validateOutputKey("foo"),
        }),
        blockConfigFactory(),
      ]);

      await analysis.run(extension);

      const block0Vars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.0");

      expect(block0Vars.isVariableDefined("@foo")).toBeFalse();

      const block1Vars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.1");

      expect(block1Vars.isVariableDefined("@foo")).toBeTrue();

      // Check that an arbitrary child of the output key is also defined
      expect(block1Vars.isVariableDefined("@foo.bar")).toBeTrue();
    });

    test("collects the output key of a conditional block", async () => {
      const extension = formStateFactory(undefined, [
        blockConfigFactory({
          if: true,
          outputKey: validateOutputKey("foo"),
        }),
        blockConfigFactory(),
      ]);

      await analysis.run(extension);

      const block0Vars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.0");

      expect(block0Vars.isVariableDefined("@foo")).toBeFalse();

      const block1Vars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.1");

      expect(block1Vars.isVariableDefined("@foo")).toBeTrue();

      // Check that an arbitrary child of the output key is also defined
      expect(block1Vars.isVariableDefined("@foo.bar")).toBeTrue();
    });
  });

  describe("blueprint @options", () => {
    beforeEach(() => {
      analysis = new VarAnalysis([]);
    });

    test("read values from blueprint and extension", async () => {
      mockBlueprintWithOptions({
        properties: {
          foo: {
            type: "string",
          },
          bar: {
            type: "string",
          },
        },
      });

      const extension = formStateFactory(
        {
          // Let this extension to have a service reference
          optionsArgs: {
            bar: "qux",
            baz: "quux",
          },
          recipe: installedRecipeMetadataFactory({
            id: validateRegistryId("test/recipe"),
          }),
        },
        [blockConfigFactory()]
      );

      await analysis.run(extension);

      const foundationKnownVars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.0");

      // A variable defined in the blueprint
      expect(foundationKnownVars.isVariableDefined("@options.foo")).toBeTrue();
      // A variable defined in the blueprint and extension options
      expect(foundationKnownVars.isVariableDefined("@options.bar")).toBeTrue();
      // A variable defined in the extension options but not in the blueprint
      expect(foundationKnownVars.isVariableDefined("@options.baz")).toBeTrue();
    });

    test("sets DEFINITELY for required options", async () => {
      mockBlueprintWithOptions({
        properties: {
          foo: {
            type: "string",
          },
          bar: {
            type: "string",
          },
        },
        required: ["foo"],
      });

      const extension = formStateFactory(
        {
          recipe: installedRecipeMetadataFactory({
            id: validateRegistryId("test/recipe"),
          }),
        },
        [blockConfigFactory()]
      );

      await analysis.run(extension);

      const knownVars = analysis.getKnownVars();

      const optionsVars = knownVars.get("extension.blockPipeline.0").getMap()[
        "options:test/recipe"
      ]["@options"];

      expect(optionsVars.foo[SELF_EXISTENCE]).toBe(VarExistence.DEFINITELY);
      expect(optionsVars.bar[SELF_EXISTENCE]).toBe(VarExistence.MAYBE);
    });

    test("sets DEFINITELY for the actually set values", async () => {
      mockBlueprintWithOptions({
        properties: {
          foo: {
            type: "string",
          },
        },
      });

      const extension = formStateFactory(
        {
          recipe: installedRecipeMetadataFactory({
            id: validateRegistryId("test/recipe"),
          }),
          optionsArgs: {
            foo: "bar",
          },
        },
        [blockConfigFactory()]
      );

      await analysis.run(extension);

      const knownVars = analysis.getKnownVars();

      const optionsVars = knownVars.get("extension.blockPipeline.0").getMap()[
        "options:test/recipe"
      ]["@options"];

      expect(optionsVars.foo[SELF_EXISTENCE]).toBe(VarExistence.DEFINITELY);
    });
  });

  describe("output key schema", () => {
    const outputKey = validateOutputKey("foo");

    async function runAnalysisWithOutputSchema(outputSchema: Schema) {
      const extension = formStateFactory(undefined, [
        blockConfigFactory({
          outputKey,
        }),
        blockConfigFactory(),
      ]);
      (blockRegistry.allTyped as jest.Mock).mockResolvedValue(
        new Map([
          [
            extension.extension.blockPipeline[0].id,
            {
              block: {
                // HtmlReader's output schema, see @/blocks/readers/HtmlReader.ts
                outputSchema,
              },
            },
          ],
        ])
      );

      await analysis.run(extension);

      return analysis.getKnownVars().get("extension.blockPipeline.1");
    }

    test("reads output schema of a block when defined", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema(
        // HtmlReader's output schema, see @/blocks/readers/HtmlReader.ts
        {
          $schema: "https://json-schema.org/draft/2019-09/schema#",
          type: "object",
          properties: {
            innerHTML: {
              type: "string",
              description: "The HTML inside the element/document",
            },
            outerHTML: {
              type: "string",
              description: "The HTML including the element/document",
            },
          },
          required: ["innerHTML", "outerHTML"],
        }
      );

      // Knows schema variables are defined
      expect(
        secondBlockKnownVars.isVariableDefined(`@${outputKey}.innerHTML`)
      ).toBeTrue();
      expect(
        secondBlockKnownVars.isVariableDefined(`@${outputKey}.outerHTML`)
      ).toBeTrue();

      // Arbitrary child of the output key is not defined
      expect(
        secondBlockKnownVars.isVariableDefined(`@${outputKey}.baz`)
      ).toBeFalse();
    });

    test("supports output schema with no properties", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema(
        // FormData's output schema, see @/blocks/transformers/FormData.ts
        {
          $schema: "https://json-schema.org/draft/2019-09/schema#",
          type: "object",
          additionalProperties: true,
        }
      );

      // The output key allows any property
      expect(
        secondBlockKnownVars.isVariableDefined(`@${outputKey}.baz`)
      ).toBeTrue();
    });

    test("supports array properties in output schema", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema(
        // PageSemanticReader's output schema, see @/blocks/readers/PageSemanticReader.ts
        {
          $schema: "https://json-schema.org/draft/2019-09/schema#",
          type: "object",
          properties: {
            alternate: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                  },
                  href: {
                    type: "string",
                  },
                },
              },
            },
          },
        }
      );

      // The output key allows only known properties
      expect(
        secondBlockKnownVars.isVariableDefined(`@${outputKey}.alternate`)
      ).toBeTrue();
      expect(
        secondBlockKnownVars.isVariableDefined(`@${outputKey}.foo`)
      ).toBeFalse();

      // The array property allows any child
      expect(
        secondBlockKnownVars.isVariableDefined(`@${outputKey}.alternate.foo`)
      ).toBeTrue();
    });
  });

  describe("if-else brick", () => {
    beforeAll(async () => {
      const ifElseBlock = {
        id: IfElse.BLOCK_ID,
        outputKey: validateOutputKey("ifOutput"),
        config: {
          condition: true,
          if: makePipelineExpression([
            blockConfigFactory({
              outputKey: validateOutputKey("foo"),
            }),
            blockConfigFactory(),
          ]),
          else: makePipelineExpression([
            blockConfigFactory({
              outputKey: validateOutputKey("bar"),
            }),
            blockConfigFactory(),
          ]),
        },
      };

      const extension = formStateFactory(undefined, [
        ifElseBlock,
        blockConfigFactory(),
      ]);

      await analysis.run(extension);
    });

    test("adds if-else output after the brick", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("extension.blockPipeline.1")
          .isVariableDefined("@ifOutput")
      ).toBeTrue();
    });

    test.each([
      "extension.blockPipeline.0.config.if.__value__.0",
      "extension.blockPipeline.0.config.if.__value__.1",
      "extension.blockPipeline.0.config.else.__value__.0",
      "extension.blockPipeline.0.config.else.__value__.1",
    ])(
      "doesn't add if-else output to sub pipelines (%s)",
      async (blockPath) => {
        expect(
          analysis.getKnownVars().get(blockPath).isVariableDefined("@ifOutput")
        ).toBeFalse();
      }
    );

    test("doesn't leak sub pipeline outputs", async () => {
      const block1Vars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.1");
      expect(block1Vars.isVariableDefined("@foo")).toBeFalse();
      expect(block1Vars.isVariableDefined("@bar")).toBeFalse();
    });
  });

  describe("for-each brick", () => {
    beforeAll(async () => {
      const forEachBlock = {
        id: ForEach.BLOCK_ID,
        outputKey: validateOutputKey("forEachOutput"),
        config: {
          elementKey: "element",
          elements: [makeTemplateExpression("nunjucks", "1")],
          body: makePipelineExpression([
            blockConfigFactory({
              outputKey: validateOutputKey("foo"),
            }),
            blockConfigFactory(),
          ]),
        },
      };

      const extension = formStateFactory(undefined, [
        forEachBlock,
        blockConfigFactory(),
      ]);

      analysis = new VarAnalysis([]);
      await analysis.run(extension);
    });

    test("adds for-each output after the brick", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("extension.blockPipeline.1")
          .isVariableDefined("@forEachOutput")
      ).toBeTrue();
    });

    test.each([
      "extension.blockPipeline.0.config.body.__value__.0",
      "extension.blockPipeline.0.config.body.__value__.1",
    ])(
      "doesn't add for-each output to sub pipelines (%s)",
      async (blockPath) => {
        expect(
          analysis
            .getKnownVars()
            .get(blockPath)
            .isVariableDefined("@forEachOutput")
        ).toBeFalse();
      }
    );

    test("doesn't leak sub pipeline outputs", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("extension.blockPipeline.1")
          .isVariableDefined("@foo")
      ).toBeFalse();
    });

    test("adds the element key to the sub pipeline", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("extension.blockPipeline.0.config.body.__value__.0")
          .isVariableDefined("@element")
      ).toBeTrue();
    });

    test("doesn't leak the sub pipeline element key", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("extension.blockPipeline.1")
          .isVariableDefined("@element")
      ).toBeFalse();
    });
  });
});

describe("Invalid template", () => {
  let extension: FormState;
  let analysis: VarAnalysis;

  beforeEach(() => {
    const invalidEchoBlock = {
      id: EchoBlock.BLOCK_ID,
      config: {
        message: makeTemplateExpression(
          "nunjucks",
          "This is a malformed template {{ @foo."
        ),
      },
    };
    const validEchoBlock = {
      id: EchoBlock.BLOCK_ID,
      config: {
        message: makeTemplateExpression(
          "nunjucks",
          "This is a valid template {{ @bar }}"
        ),
      },
    };

    extension = formStateFactory(undefined, [invalidEchoBlock, validEchoBlock]);

    analysis = new VarAnalysis([]);
  });

  test("analysis doesn't throw", async () => {
    await expect(analysis.run(extension)).toResolve();
  });

  test("analysis doesn't annotate invalid template", async () => {
    await analysis.run(extension);
    const annotations = analysis.getAnnotations();

    // Only the second (index = 1) block should be annotated
    expect(annotations).toHaveLength(1);
    expect(annotations[0].position.path).toEqual(
      "extension.blockPipeline.1.config.message"
    );
  });
});
