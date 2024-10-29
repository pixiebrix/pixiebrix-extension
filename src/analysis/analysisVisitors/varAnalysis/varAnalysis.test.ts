/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import VarAnalysis, {
  INVALID_VARIABLE_GENERIC_MESSAGE,
  VARIABLE_SHOULD_START_WITH_AT_MESSAGE,
  NO_VARIABLE_PROVIDED_MESSAGE,
} from "./varAnalysis";
import { validateRegistryId } from "@/types/helpers";
import { BrickTypes, validateOutputKey } from "@/runtime/runtimeTypes";
import IfElse from "@/bricks/transformers/controlFlow/IfElse";
import ForEach from "@/bricks/transformers/controlFlow/ForEach";
import { EchoBrick } from "@/runtime/pipelineTests/testHelpers";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import modRegistry from "@/modDefinitions/registry";
import brickRegistry from "@/bricks/registry";
import { SELF_EXISTENCE, VarExistence } from "./varMap";
import TryExcept from "@/bricks/transformers/controlFlow/TryExcept";
import ForEachElement from "@/bricks/transformers/controlFlow/ForEachElement";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { createNewDocumentBuilderElement } from "@/pageEditor/documentBuilder/createNewDocumentBuilderElement";
import {
  type ButtonElement,
  type DocumentBuilderElement,
  type ListElement,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { type Schema } from "@/types/schemaTypes";
import { integrationConfigLocator } from "@/background/messenger/api";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import {
  formStateFactory,
  triggerFormStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { toExpression } from "@/utils/expressionUtils";
import IdentityTransformer from "@/bricks/transformers/IdentityTransformer";
import { createNewConfiguredBrick } from "@/bricks/exampleBrickConfigs";
import pixiebrixIntegrationDependencyFactory from "@/integrations/util/pixiebrixIntegrationDependencyFactory";

jest
  .mocked(integrationConfigLocator.findSanitizedIntegrationConfig)
  .mockResolvedValue(
    sanitizedIntegrationConfigFactory({
      serviceId: validateRegistryId("@test/service"),
    }),
  );

// XXX: should be using actual bricks instead of a single outputSchema across all tests in order to test
// different outputSchema scenarios
jest.mock("@/bricks/registry", () => ({
  __esModule: true,
  default: {
    lookup: jest.fn().mockResolvedValue({
      outputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: {
            type: "string",
          },
          url: {
            type: "string",
            format: "uri",
          },
          lang: {
            type: "string",
            enum: ["en"],
          },
          record: {
            type: "object",
            properties: {
              baz: {
                type: "string",
              },
            },
            additionalProperties: false,
          },
        },
      },
    }),
    allTyped: jest.fn().mockResolvedValue(new Map()),
  },
}));

jest.mock("@/modDefinitions/registry");

describe("Collecting available vars", () => {
  function mockModWithOptions(optionsSchema: any) {
    jest.mocked(modRegistry.lookup).mockResolvedValue(
      defaultModDefinitionFactory({
        options: {
          schema: optionsSchema,
        },
      }) as any,
    );
  }

  let analysis: VarAnalysis;
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("general", () => {
    beforeEach(() => {
      analysis = new VarAnalysis();
    });

    test("collects the context vars", async () => {
      mockModWithOptions({
        properties: {
          foo: {
            type: "string",
          },
        },
      });

      const formState = formStateFactory({
        formStateConfig: {
          // Test both the PixieBrix api integration and a sample third-party service
          integrationDependencies: [
            integrationDependencyFactory({
              integrationId: validateRegistryId("@test/service"),
              outputKey: validateOutputKey("testService"),
              configId: uuidSequence,
            }),
            pixiebrixIntegrationDependencyFactory(),
          ],
          modMetadata: modMetadataFactory({
            id: validateRegistryId("test/mod"),
          }),
        },
        brickPipeline: [brickConfigFactory()],
      });

      await analysis.run(formState, {
        optionsArgs: { foo: "bar" },
      });

      const knownVars = analysis.getKnownVars();
      expect(knownVars.size).toBe(1);

      const foundationKnownVars = knownVars.get(
        "modComponent.brickPipeline.0",
      )!;
      expect(foundationKnownVars.isVariableDefined("@input.title")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@input.url")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@input.lang")).toBeTrue();

      expect(foundationKnownVars.isVariableDefined("@options.foo")).toBeTrue();

      expect(
        foundationKnownVars.isVariableDefined(
          "@testService.__service.serviceId",
        ),
      ).toBeTrue();
      expect(
        foundationKnownVars.isVariableDefined("@pixiebrix.__service.serviceId"),
      ).toBeTrue();
    });

    test("collects the output key", async () => {
      const formState = formStateFactory({
        brickPipeline: [
          brickConfigFactory({
            outputKey: validateOutputKey("foo"),
          }),
          brickConfigFactory(),
        ],
      });

      await analysis.run(formState, { optionsArgs: {} });

      const block0Vars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.0")!;

      expect(block0Vars.isVariableDefined("@foo")).toBeFalse();

      const block1Vars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.1")!;

      expect(block1Vars.isVariableDefined("@foo")).toBeTrue();

      // Check that an arbitrary child of the output key is also defined
      expect(block1Vars.isVariableDefined("@foo.bar")).toBeTrue();
    });

    test("collects the output key of a conditional block", async () => {
      const formState = formStateFactory({
        brickPipeline: [
          brickConfigFactory({
            if: true,
            outputKey: validateOutputKey("foo"),
          }),
          brickConfigFactory(),
        ],
      });

      await analysis.run(formState, { optionsArgs: {} });

      const block0Vars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.0")!;

      expect(block0Vars.isVariableDefined("@foo")).toBeFalse();

      const block1Vars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.1")!;

      expect(block1Vars.isVariableDefined("@foo")).toBeTrue();

      // Check that an arbitrary child of the output key is also defined
      expect(block1Vars.isVariableDefined("@foo.bar")).toBeTrue();
    });
  });

  describe("mod variables", () => {
    it("collects actual mod variables", async () => {
      const analysis = new VarAnalysis({ modState: { foo: 42 } });

      const formState = formStateFactory({
        brickPipeline: [brickConfigFactory()],
      });

      await analysis.run(formState, { optionsArgs: {} });

      const foundationKnownVars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.0")!;

      expect(foundationKnownVars.isVariableDefined("@mod")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@mod.foo")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@mod.bar")).toBeFalse();
    });

    it("collects nested mod variables", async () => {
      const analysis = new VarAnalysis({
        modState: {
          foo: { data: 42, cachedData: 41, isLoading: true, isFetching: false },
        },
      });

      const formState = formStateFactory({
        brickPipeline: [brickConfigFactory()],
      });

      await analysis.run(formState, { optionsArgs: {} });

      const foundationKnownVars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.0")!;

      expect(foundationKnownVars.isVariableDefined("@mod")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@mod.foo")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@mod.foo.data")).toBeTrue();
      expect(
        foundationKnownVars.isVariableDefined("@mod.foo.cachedData"),
      ).toBeTrue();
      expect(
        foundationKnownVars.isVariableDefined("@mod.foo.isLoading"),
      ).toBeTrue();
      expect(
        foundationKnownVars.isVariableDefined("@mod.foo.isFetching"),
      ).toBeTrue();
      expect(
        foundationKnownVars.isVariableDefined("@mod.foo.error"),
      ).toBeFalse();
    });

    it("handles inferred mod variables", async () => {
      const analysis = new VarAnalysis({ modVariables: [{ foo: {} }] });

      const formState = formStateFactory({
        brickPipeline: [brickConfigFactory()],
      });

      await analysis.run(formState, { optionsArgs: {} });

      const foundationKnownVars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.0")!;

      expect(foundationKnownVars.isVariableDefined("@mod")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@mod.foo")).toBeTrue();
      expect(foundationKnownVars.isVariableDefined("@mod.bar")).toBeFalse();
    });
  });

  describe("mod @options", () => {
    beforeEach(() => {
      analysis = new VarAnalysis();
    });

    test.each([{}, null, undefined])("no options", async (optionsSchema) => {
      mockModWithOptions(optionsSchema);

      const formState = formStateFactory({
        formStateConfig: {
          modMetadata: modMetadataFactory({
            id: validateRegistryId("test/mod"),
          }),
        },
        brickPipeline: [brickConfigFactory()],
      });

      await analysis.run(formState, { optionsArgs: {} });

      const foundationKnownVars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.0")!;

      expect(foundationKnownVars.isVariableDefined("@options")).toBeFalse();
    });

    test("read values from mod and mod component", async () => {
      mockModWithOptions({
        properties: {
          foo: {
            type: "string",
          },
          bar: {
            type: "string",
          },
        },
      });

      const formState = formStateFactory({
        formStateConfig: {
          modMetadata: modMetadataFactory({
            id: validateRegistryId("test/mod"),
          }),
        },
        brickPipeline: [brickConfigFactory()],
      });

      await analysis.run(formState, {
        optionsArgs: {
          bar: "qux",
          baz: "quux",
        },
      });

      const foundationKnownVars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.0")!;

      // A variable defined in the mod
      expect(foundationKnownVars.isVariableDefined("@options.foo")).toBeTrue();
      // A variable defined in the mod and mod component options
      expect(foundationKnownVars.isVariableDefined("@options.bar")).toBeTrue();
      // A variable defined in the mod component options but not in the mod
      expect(foundationKnownVars.isVariableDefined("@options.baz")).toBeTrue();
    });

    test("sets DEFINITELY for required options", async () => {
      mockModWithOptions({
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

      const formState = formStateFactory({
        formStateConfig: {
          modMetadata: modMetadataFactory({
            id: validateRegistryId("test/mod"),
          }),
        },
        brickPipeline: [brickConfigFactory()],
      });

      await analysis.run(formState, { optionsArgs: {} });

      const knownVars = analysis.getKnownVars();

      const optionsVars = knownVars
        .get("modComponent.brickPipeline.0")!
        .getMap()["options:test/mod"]!["@options"]!;

      expect(optionsVars.foo![SELF_EXISTENCE]).toBe(VarExistence.DEFINITELY);
      expect(optionsVars.bar![SELF_EXISTENCE]).toBe(VarExistence.MAYBE);
    });

    test("sets DEFINITELY for the actually set values", async () => {
      mockModWithOptions({
        properties: {
          foo: {
            type: "string",
          },
        },
      });

      const formState = formStateFactory({
        formStateConfig: {
          modMetadata: modMetadataFactory({
            id: validateRegistryId("test/mod"),
          }),
        },
        brickPipeline: [brickConfigFactory()],
      });

      await analysis.run(formState, {
        optionsArgs: {
          foo: "bar",
        },
      });

      const knownVars = analysis.getKnownVars();

      const optionsVars = knownVars
        .get("modComponent.brickPipeline.0")!
        .getMap()["options:test/mod"]!["@options"]!;

      expect(optionsVars.foo![SELF_EXISTENCE]).toBe(VarExistence.DEFINITELY);
    });
  });

  describe("output key schema", () => {
    const outputKey = validateOutputKey("foo");

    async function runAnalysisWithOutputSchema(outputSchema: Schema) {
      const formState = formStateFactory({
        brickPipeline: [
          brickConfigFactory({
            outputKey,
          }),
          brickConfigFactory(),
        ],
      });
      jest.mocked(brickRegistry.allTyped).mockResolvedValue(
        new Map([
          [
            formState.modComponent.brickPipeline[0]!.id,
            {
              block: {
                // HtmlReader's output schema, see @/bricks/readers/HtmlReader.ts
                outputSchema,
              },
            },
          ],
        ]) as any,
      );

      await analysis.run(formState, { optionsArgs: {} });

      return analysis.getKnownVars().get("modComponent.brickPipeline.1");
    }

    test("reads output schema of a block when defined", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema(
        // HtmlReader's output schema, see @/bricks/readers/HtmlReader.ts
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
        },
      );

      // Knows schema variables are defined
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.innerHTML`),
      ).toBeTrue();
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.outerHTML`),
      ).toBeTrue();

      // Arbitrary child of the output key is not defined
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.baz`),
      ).toBeFalse();
    });

    test("supports output schema with no properties", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema(
        // FormData's output schema, see @/bricks/transformers/FormData.ts
        {
          $schema: "https://json-schema.org/draft/2019-09/schema#",
          type: "object",
          additionalProperties: true,
        },
      );

      // The output key allows any property
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.baz`),
      ).toBeTrue();
    });

    test("supports true definition in output schema", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema({
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {
          foo: true,
        },
      });

      // The output key allows any property
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.foo`),
      ).toBeTrue();
    });

    test("supports nested objects in schema", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema({
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "The email address for the account",
          },
          user: {
            type: "object",
            required: ["id", "name"],
            description: "The user id for the account",
            properties: {
              id: {
                type: "string",
                format: "uuid",
              },
              name: {
                type: "string",
              },
            },
          },
        },
        required: ["user"],
      });

      // Knows schema variables are defined
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.email`),
      ).toBeTrue();
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.user.id`),
      ).toBeTrue();
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.user.name`),
      ).toBeTrue();

      // Arbitrary child of the user property is not defined
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.user.baz`),
      ).toBeFalse();
    });

    test("supports array of objects", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema(
        // PageSemanticReader's output schema, see @/bricks/readers/PageSemanticReader.ts
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
        },
      );

      // The output key allows only known properties
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.alternate`),
      ).toBeTrue();
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.foo`),
      ).toBeFalse();

      // The array items are known
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.alternate.0`),
      ).toBeTrue();

      // Non-index access is not allowed
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.alternate.foo`),
      ).toBeFalse();

      // Only the known properties of array items are allowed
      expect(
        secondBlockKnownVars!.isVariableDefined(
          `@${outputKey}.alternate.0.href`,
        ),
      ).toBeTrue();
      expect(
        secondBlockKnownVars!.isVariableDefined(
          `@${outputKey}.alternate.0.foo`,
        ),
      ).toBeFalse();
      expect(
        secondBlockKnownVars!.isVariableDefined(
          `@${outputKey}.alternate.0.href.foo`,
        ),
      ).toBeFalse();
    });

    test("supports array of primitives", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema({
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {
          alternate: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      });

      // The output key allows only known properties
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.alternate`),
      ).toBeTrue();

      // The array items are known
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.alternate.0`),
      ).toBeTrue();

      // Non-index access is not allowed
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.alternate.foo`),
      ).toBeFalse();

      // Item's properties are not allowed
      expect(
        secondBlockKnownVars!.isVariableDefined(
          `@${outputKey}.alternate.0.bar`,
        ),
      ).toBeFalse();
    });

    test("works with additionalItems in an array", async () => {
      const secondBlockKnownVars = await runAnalysisWithOutputSchema({
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {
          alternate: {
            type: "array",
            items: [
              {
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
            ],
            additionalItems: {
              type: "string",
            },
          },
        },
      });

      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.alternate.0`),
      ).toBeTrue();

      // Non-index access is not allowed
      expect(
        secondBlockKnownVars!.isVariableDefined(`@${outputKey}.alternate.foo`),
      ).toBeFalse();

      // Any item's properties are allowed
      expect(
        secondBlockKnownVars!.isVariableDefined(
          `@${outputKey}.alternate.0.bar`,
        ),
      ).toBeTrue();
    });
  });

  describe("if-else brick", () => {
    beforeAll(async () => {
      const ifElseBlock = {
        id: IfElse.BRICK_ID,
        outputKey: validateOutputKey("ifOutput"),
        config: {
          condition: true,
          if: toExpression("pipeline", [
            brickConfigFactory({
              outputKey: validateOutputKey("foo"),
            }),
            brickConfigFactory(),
          ]),
          else: toExpression("pipeline", [
            brickConfigFactory({
              outputKey: validateOutputKey("bar"),
            }),
            brickConfigFactory(),
          ]),
        },
      };

      const formState = formStateFactory({
        brickPipeline: [ifElseBlock, brickConfigFactory()],
      });

      await analysis.run(formState, { optionsArgs: {} });
    });

    test("adds if-else output after the brick", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.1")!
          .isVariableDefined("@ifOutput"),
      ).toBeTrue();
    });

    test.each([
      "modComponent.brickPipeline.0.config.if.__value__.0",
      "modComponent.brickPipeline.0.config.if.__value__.1",
      "modComponent.brickPipeline.0.config.else.__value__.0",
      "modComponent.brickPipeline.0.config.else.__value__.1",
    ])(
      "doesn't add if-else output to sub pipelines (%s)",
      async (blockPath) => {
        expect(
          analysis
            .getKnownVars()
            .get(blockPath)!
            .isVariableDefined("@ifOutput"),
        ).toBeFalse();
      },
    );

    test("doesn't leak sub pipeline outputs", async () => {
      const block1Vars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.1")!;
      expect(block1Vars.isVariableDefined("@foo")).toBeFalse();
      expect(block1Vars.isVariableDefined("@bar")).toBeFalse();
    });
  });

  describe("optional chaining", () => {
    test("supports optional chaining", async () => {
      const brickConfiguration = {
        ...createNewConfiguredBrick(IdentityTransformer.BRICK_ID),
        outputKey: validateOutputKey("foo"),
        // XXX: config doesn't matter here because the output schema is mocked in these tests vs. using
        // the actual output schema from the brick :shrug:
        config: {
          bar: "42",
        },
      };

      jest.mocked(brickRegistry.allTyped).mockResolvedValue(
        new Map([
          [
            IdentityTransformer.BRICK_ID,
            {
              type: BrickTypes.TRANSFORM,
              block: new IdentityTransformer(),
            },
          ],
        ]),
      );

      const formState = formStateFactory({
        brickPipeline: [brickConfiguration, brickConfiguration],
      });

      analysis = new VarAnalysis();
      await analysis.run(formState, { optionsArgs: {} });

      const knownVars = analysis.getKnownVars();
      const varMap = knownVars.get("modComponent.brickPipeline.1")!;

      // Check optional chaining handled for first variable
      expect(varMap.isVariableDefined("@input")).toBeTrue();
      expect(varMap.isVariableDefined("@input?.url")).toBeTrue();

      // Check optional chaining is handled for local variables
      expect(varMap.isVariableDefined("@foo")).toBeTrue();
      expect(varMap.isVariableDefined("@foo?.url")).toBeFalse();
      expect(varMap.isVariableDefined("@foo?.bar")).toBeTrue();
      expect(varMap.isVariableDefined("@foo?.baz")).toBeFalse();
      // XXX: it parses, but is not allowed because the identity brick ALLOW_ANY_CHILD is false for bar
      expect(varMap.isVariableDefined("@foo.bar?.length")).toBeFalse();
    });
  });

  describe("document builder list element", () => {
    beforeAll(async () => {
      const listElement = createNewDocumentBuilderElement(
        "list",
      ) as ListElement;
      const textElement = createNewDocumentBuilderElement("text");
      textElement.config.text = toExpression(
        "nunjucks",
        "{{ @foo }} {{ @element }}",
      );
      listElement.config.element.__value__ = textElement;

      const otherTextElement = createNewDocumentBuilderElement("text");
      otherTextElement.config.text = toExpression("nunjucks", "{{ @element }}");

      const documentRendererBrick = {
        id: DocumentRenderer.BRICK_ID,
        config: {
          body: [listElement, otherTextElement],
        },
      };

      const formState = formStateFactory({
        brickPipeline: [documentRendererBrick],
      });

      analysis = new VarAnalysis();
      await analysis.run(formState, { optionsArgs: {} });
    });

    test("adds the list element key list body", () => {
      const knownVars = analysis.getKnownVars();
      const listElementVarMap = knownVars.get(
        "modComponent.brickPipeline.0.config.body.0.config.element.__value__",
      )!;

      expect(listElementVarMap.isVariableDefined("@element")).toBeTrue();
      expect(listElementVarMap.isVariableDefined("@foo")).toBeFalse();
    });

    test("adds annotations", () => {
      const annotations = analysis.getAnnotations();
      expect(annotations).toHaveLength(2);

      // Check warning is generated for @foo but not @element
      expect(annotations[0]!.message).toBe(
        'Variable "@foo" might not be defined',
      );
      expect(annotations[0]!.position.path).toBe(
        "modComponent.brickPipeline.0.config.body.0.config.element.__value__.config.text",
      );

      // Not available in to the peer element to the list
      expect(annotations[1]!.message).toBe(
        'Variable "@element" might not be defined',
      );
      expect(annotations[1]!.position.path).toBe(
        "modComponent.brickPipeline.0.config.body.1.config.text",
      );
    });
  });

  describe("document builder list element with button", () => {
    beforeAll(async () => {
      const listElement = createNewDocumentBuilderElement(
        "list",
      ) as ListElement;
      const rowElement = createNewDocumentBuilderElement(
        "row",
      ) as DocumentBuilderElement<"row">;
      listElement.config.element.__value__ = rowElement;

      const buttonElement = createNewDocumentBuilderElement(
        "button",
      ) as ButtonElement;
      rowElement.children![0]!.children!.push(buttonElement);

      buttonElement.config.onClick = toExpression("pipeline", [
        brickConfigFactory({
          config: {
            text: toExpression("nunjucks", "{{ @foo }}"),
          },
        }),
      ]);

      const documentRendererBrick = {
        id: DocumentRenderer.BRICK_ID,
        config: {
          body: [listElement],
        },
      };

      const formState = formStateFactory({
        brickPipeline: [documentRendererBrick],
      });

      analysis = new VarAnalysis();
      await analysis.run(formState, { optionsArgs: {} });
    });

    test("adds the list element key list body", () => {
      const knownVars = analysis.getKnownVars();
      const buttonPipelineVarMap = knownVars.get(
        "modComponent.brickPipeline.0.config.body.0.config.element.__value__.children.0.children.0.config.onClick.__value__.0",
      )!;

      expect(buttonPipelineVarMap.isVariableDefined("@input")).toBeTrue();
      expect(buttonPipelineVarMap.isVariableDefined("@element")).toBeTrue();
      expect(buttonPipelineVarMap.isVariableDefined("@foo")).toBeFalse();
    });

    test("adds annotations", () => {
      const annotations = analysis.getAnnotations();
      expect(annotations).toHaveLength(1);

      expect(annotations[0]).toStrictEqual({
        analysisId: "var",
        message: 'Variable "@foo" might not be defined',
        type: "warning",
        position: {
          path: "modComponent.brickPipeline.0.config.body.0.config.element.__value__.children.0.children.0.config.onClick.__value__.0.config.text",
        },
        detail: {
          expression: expect.toBeObject(),
        },
      });
    });
  });

  describe("try-except brick", () => {
    beforeAll(async () => {
      const tryExceptBlock = {
        id: TryExcept.BRICK_ID,
        outputKey: validateOutputKey("typeExcept"),
        config: {
          errorKey: "error",
          try: toExpression("pipeline", [brickConfigFactory()]),
          except: toExpression("pipeline", [brickConfigFactory()]),
        },
      };

      const formState = formStateFactory({
        brickPipeline: [tryExceptBlock, brickConfigFactory()],
      });

      analysis = new VarAnalysis();
      await analysis.run(formState, { optionsArgs: {} });
    });

    test("adds the error key to the except branch", () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.0.config.except.__value__.0")!
          .isVariableDefined("@error"),
      ).toBeTrue();
    });

    test("does not add the error key to the try branch", () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.0.config.try.__value__.0")!
          .isVariableDefined("@error"),
      ).toBeFalse();
    });
  });

  describe("for-each element brick", () => {
    beforeAll(async () => {
      const forEachBlock = {
        id: ForEachElement.BRICK_ID,
        outputKey: validateOutputKey("forEachOutput"),
        config: {
          elementKey: "element",
          selector: "a",
          body: toExpression("pipeline", [brickConfigFactory()]),
        },
      };

      const formState = formStateFactory({
        brickPipeline: [forEachBlock, brickConfigFactory()],
      });

      analysis = new VarAnalysis();
      await analysis.run(formState, { optionsArgs: {} });
    });

    test("adds the element key to the sub pipeline", () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.0.config.body.__value__.0")!
          .isVariableDefined("@element"),
      ).toBeTrue();
    });
  });

  describe("for-each brick", () => {
    beforeAll(async () => {
      const forEachBlock = {
        id: ForEach.BRICK_ID,
        outputKey: validateOutputKey("forEachOutput"),
        config: {
          elementKey: "element",
          elements: [toExpression("nunjucks", "1")],
          body: toExpression("pipeline", [
            brickConfigFactory({
              outputKey: validateOutputKey("foo"),
            }),
            brickConfigFactory(),
          ]),
        },
      };

      const formState = formStateFactory({
        brickPipeline: [forEachBlock, brickConfigFactory()],
      });

      analysis = new VarAnalysis();
      await analysis.run(formState, { optionsArgs: {} });
    });

    test("adds for-each output after the brick", () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.1")!
          .isVariableDefined("@forEachOutput"),
      ).toBeTrue();
    });

    test.each([
      "modComponent.brickPipeline.0.config.body.__value__.0",
      "modComponent.brickPipeline.0.config.body.__value__.1",
    ])("doesn't add for-each output to sub pipelines (%s)", (blockPath) => {
      expect(
        analysis
          .getKnownVars()
          .get(blockPath)!
          .isVariableDefined("@forEachOutput"),
      ).toBeFalse();
    });

    test("doesn't leak sub pipeline outputs", () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.1")!
          .isVariableDefined("@foo"),
      ).toBeFalse();
    });

    test("adds the element key to the sub pipeline", () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.0.config.body.__value__.0")!
          .isVariableDefined("@element"),
      ).toBeTrue();
    });

    test("doesn't leak the sub pipeline element key", () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.1")!
          .isVariableDefined("@element"),
      ).toBeFalse();
    });

    test.each([
      "modComponent.brickPipeline.0.config.body.__value__.0",
      "modComponent.brickPipeline.0.config.body.__value__.1",
    ])("source of the @element key if the For-Each block (%s)", (blockPath) => {
      const blockVars = analysis.getKnownVars().get(blockPath)!.getMap();

      const expectedForEachBlockPath = "modComponent.brickPipeline.0";

      // Find the source that provided the @element variable
      const actualForEachBlockPath = Object.entries(blockVars).find(
        ([, node]) => "@element" in node,
      )![0];

      expect(actualForEachBlockPath).toBe(expectedForEachBlockPath);
    });
  });

  describe("custom form renderer brick", () => {
    beforeAll(async () => {
      const customFormBlock = {
        id: CustomFormRenderer.BRICK_ID,
        config: {
          schema: {
            type: "object",
            properties: {
              foo: {
                type: "string",
              },
            },
          },
          onSubmit: toExpression("pipeline", [brickConfigFactory()]),
        },
      };

      const formState = formStateFactory({
        brickPipeline: [customFormBlock, brickConfigFactory()],
      });

      jest.mocked(brickRegistry.allTyped).mockResolvedValue(
        new Map([
          [
            CustomFormRenderer.BRICK_ID,
            {
              type: "renderer",
              block: new CustomFormRenderer(),
            },
          ],
        ]),
      );

      analysis = new VarAnalysis();
      await analysis.run(formState, { optionsArgs: {} });
    });

    test("adds the `values` to the onsubmit handler", () => {
      expect(
        analysis
          .getKnownVars()
          .get("modComponent.brickPipeline.0.config.onSubmit.__value__.0")!
          .isVariableDefined("@values"),
      ).toBeTrue();
    });

    test("adds the form fields to the onsubmit handler", () => {
      const blockVars = analysis
        .getKnownVars()
        .get("modComponent.brickPipeline.0.config.onSubmit.__value__.0")!;

      expect(blockVars.isVariableDefined("@values.foo")).toBeTrue();
      expect(blockVars.isVariableDefined("@values.bar")).toBeFalse();
    });
  });
});

describe("Invalid template", () => {
  let formState: ModComponentFormState;
  let analysis: VarAnalysis;

  beforeEach(() => {
    const invalidEchoBlock = {
      id: EchoBrick.BRICK_ID,
      config: {
        message: toExpression(
          "nunjucks",
          "This is a malformed template {{ @foo.",
        ),
      },
    };
    const validEchoBlock = {
      id: EchoBrick.BRICK_ID,
      config: {
        message: toExpression(
          "nunjucks",
          "This is a valid template {{ @bar }}",
        ),
      },
    };

    formState = formStateFactory({
      brickPipeline: [invalidEchoBlock, validEchoBlock],
    });

    analysis = new VarAnalysis();
  });

  test("analysis doesn't throw", async () => {
    await expect(analysis.run(formState, { optionsArgs: {} })).toResolve();
  });

  test("analysis doesn't annotate invalid template", async () => {
    await analysis.run(formState, { optionsArgs: {} });
    const annotations = analysis.getAnnotations();

    // Only the second (index = 1) block should be annotated
    expect(annotations).toHaveLength(1);
    expect(annotations[0]!.position.path).toBe(
      "modComponent.brickPipeline.1.config.message",
    );
  });
});

describe("var expression annotations", () => {
  test("doesn't annotate valid expressions", async () => {
    const formState = formStateFactory({
      brickPipeline: [
        brickConfigFactory({
          outputKey: validateOutputKey("foo"),
        }),
        {
          id: EchoBrick.BRICK_ID,
          config: {
            message: toExpression("var", "@foo"),
          },
        },
      ],
    });

    const analysis = new VarAnalysis();
    await analysis.run(formState, { optionsArgs: {} });

    expect(analysis.getAnnotations()).toHaveLength(0);
  });

  test("doesn't annotate empty variable", async () => {
    const formState = formStateFactory({
      brickPipeline: [
        {
          id: EchoBrick.BRICK_ID,
          config: {
            message: toExpression("var", ""),
          },
        },
      ],
    });

    const analysis = new VarAnalysis();
    await analysis.run(formState, { optionsArgs: {} });

    expect(analysis.getAnnotations()).toHaveLength(0);
  });

  test("annotates variable which doesn't start with @", async () => {
    const formState = formStateFactory({
      brickPipeline: [
        {
          id: EchoBrick.BRICK_ID,
          config: {
            message: toExpression("var", "foo"),
          },
        },
      ],
    });

    const analysis = new VarAnalysis();
    await analysis.run(formState, { optionsArgs: {} });

    const annotations = analysis.getAnnotations();
    expect(annotations).toHaveLength(1);
    expect(annotations[0]!.message).toEqual(
      VARIABLE_SHOULD_START_WITH_AT_MESSAGE,
    );
  });

  test("annotates variable which is just whitespace", async () => {
    const formState = formStateFactory({
      brickPipeline: [
        {
          id: EchoBrick.BRICK_ID,
          config: {
            message: toExpression("var", "  "),
          },
        },
      ],
    });

    const analysis = new VarAnalysis();
    await analysis.run(formState, { optionsArgs: {} });

    const annotations = analysis.getAnnotations();
    expect(annotations).toHaveLength(1);
    expect(annotations[0]!.message).toEqual(NO_VARIABLE_PROVIDED_MESSAGE);
  });

  test("return a generic error message for a single @ character", async () => {
    const formState = formStateFactory({
      brickPipeline: [
        {
          id: EchoBrick.BRICK_ID,
          config: {
            message: toExpression("var", "@"),
          },
        },
      ],
    });

    const analysis = new VarAnalysis();
    await analysis.run(formState, { optionsArgs: {} });

    const annotations = analysis.getAnnotations();
    expect(annotations).toHaveLength(1);
    expect(annotations[0]!.message).toEqual(INVALID_VARIABLE_GENERIC_MESSAGE);
  });
});

describe("var analysis integration tests", () => {
  it("should handle trigger event", async () => {
    const formState = triggerFormStateFactory(undefined, [
      {
        id: EchoBrick.BRICK_ID,
        config: {
          message: toExpression(
            "nunjucks",
            "{{ @input.event.key }} was pressed",
          ),
        },
      },
    ]);

    formState.starterBrick.definition.trigger = "keypress";

    const analysis = new VarAnalysis();
    await analysis.run(formState, { optionsArgs: {} });

    const annotations = analysis.getAnnotations();
    expect(annotations).toHaveLength(0);
  });

  it("should handle trigger custom event", async () => {
    const formState = triggerFormStateFactory(undefined, [
      {
        id: EchoBrick.BRICK_ID,
        config: {
          message: toExpression(
            "nunjucks",
            "{{ @input.event.thiscouldbeanything }} was pressed",
          ),
        },
      },
    ]);

    formState.starterBrick.definition.trigger = "custom";

    const analysis = new VarAnalysis();
    await analysis.run(formState, { optionsArgs: {} });

    const annotations = analysis.getAnnotations();
    expect(annotations).toHaveLength(0);
  });

  it("should handle trigger selectionchange event", async () => {
    const formState = triggerFormStateFactory(undefined, [
      {
        id: EchoBrick.BRICK_ID,
        config: {
          message: toExpression(
            "nunjucks",
            // Only @input.event.selectedText is available for selectionchange
            "{{ @input.event.key }} was pressed",
          ),
        },
      },
    ]);

    formState.starterBrick.definition.trigger = "selectionchange";

    const analysis = new VarAnalysis();
    await analysis.run(formState, { optionsArgs: {} });

    const annotations = analysis.getAnnotations();
    expect(annotations).toHaveLength(1);
  });
});
