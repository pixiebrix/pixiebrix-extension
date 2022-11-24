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
  blockConfigFactory,
  formStateFactory,
  installedRecipeMetadataFactory,
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
import { VarExistence } from "./varMap2";

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
  },
}));

describe("Collecting available vars", () => {
  let analysis: VarAnalysis;
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("general", () => {
    beforeEach(() => {
      analysis = new VarAnalysis([]);
    });

    test("collects the context vars", async () => {
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

      expect(foundationKnownVars.getExistence("@input.title")).toEqual(
        VarExistence.DEFINITELY
      );
      expect(foundationKnownVars.getExistence("@input.url")).toEqual(
        VarExistence.DEFINITELY
      );
      expect(foundationKnownVars.getExistence("@input.lang")).toEqual(
        VarExistence.DEFINITELY
      );

      expect(foundationKnownVars.getExistence("@options.foo")).toEqual(
        VarExistence.DEFINITELY
      );

      expect(
        foundationKnownVars.getExistence("@pixiebrix.__service.serviceId")
      ).toEqual(VarExistence.DEFINITELY);
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

      expect(block0Vars.getExistence("@foo")).toBeUndefined();

      const block1Vars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.1");

      expect(block1Vars.getExistence("@foo")).toBe(VarExistence.DEFINITELY);

      // Check that an arbitrary child of the output key is also marked as MAYBE
      expect(block1Vars.getExistence("@foo.bar")).toBe(VarExistence.MAYBE);
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

      expect(block0Vars.getExistence("@foo")).toBeUndefined();

      const block1Vars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.1");

      expect(block1Vars.getExistence("@foo")).toBe(VarExistence.MAYBE);

      // Check that an arbitrary child of the output key is also marked as MAYBE
      expect(block1Vars.getExistence("@foo.bar")).toBe(VarExistence.MAYBE);
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
          .getExistence("@ifOutput")
      ).toBe(VarExistence.DEFINITELY);
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
          analysis.getKnownVars().get(blockPath).getExistence("@ifOutput")
        ).toBeUndefined();
      }
    );

    test("doesn't leak sub pipeline outputs", async () => {
      const block1Vars = analysis
        .getKnownVars()
        .get("extension.blockPipeline.1");
      expect(block1Vars.getExistence("@foo")).toBeUndefined();
      expect(block1Vars.getExistence("@bar")).toBeUndefined();
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
          .getExistence("@forEachOutput")
      ).toBe(VarExistence.DEFINITELY);
    });

    test.each([
      "extension.blockPipeline.0.config.body.__value__.0",
      "extension.blockPipeline.0.config.body.__value__.1",
    ])(
      "doesn't add for-each output to sub pipelines (%s)",
      async (blockPath) => {
        expect(
          analysis.getKnownVars().get(blockPath).getExistence("@forEachOutput")
        ).toBeUndefined();
      }
    );

    test("doesn't leak sub pipeline outputs", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("extension.blockPipeline.1")
          .getExistence("@foo")
      ).toBeUndefined();
    });

    test("adds the element key to the sub pipeline", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("extension.blockPipeline.0.config.body.__value__.0")
          .getExistence("@element")
      ).toBe(VarExistence.DEFINITELY);
    });

    test("doesn't leak the sub pipeline element key", async () => {
      expect(
        analysis
          .getKnownVars()
          .get("extension.blockPipeline.1")
          .getExistence("@element")
      ).toBeUndefined();
    });
  });
});
