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

import { blockConfigFactory, formStateFactory } from "@/testUtils/factories";
import VarAnalysis, { getVarsFromObject, VarExistence } from "./varAnalysis";
import { services } from "@/background/messenger/api";
import { validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import IfElse from "@/blocks/transformers/controlFlow/IfElse";
import { toExpression } from "@/testUtils/testHelpers";
import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import {
  makePipelineExpression,
  makeTemplateExpression,
} from "@/runtime/expressionCreators";

jest.mock("@/background/messenger/api", () => ({
  __esModule: true,
  services: {
    locate: jest.fn(),
  },
}));

describe("getVarsFromObject", () => {
  test("gets all the root keys", () => {
    const obj = {
      foo: "bar",
      baz: "qux",
    };
    expect(getVarsFromObject(obj)).toEqual(["foo", "baz"]);
  });

  test("gets all the nested keys", () => {
    const obj = {
      foo: {
        bar: "baz",
      },
    };
    expect(getVarsFromObject(obj)).toEqual(["foo", "foo.bar"]);
  });
});

describe("VarAnalysis", () => {
  beforeAll(() => {
    (services.locate as jest.Mock).mockResolvedValue({
      serviceId: "@test/service",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      },
      [blockConfigFactory()]
    );

    const analysis = new VarAnalysis();
    await analysis.run(extension);

    expect(analysis.knownVars.size).toBe(1);
    expect([
      ...analysis.knownVars.get("extension.blockPipeline.0").keys(),
    ]).toEqual([
      "@pixiebrix",
      "@pixiebrix.__service",
      "@pixiebrix.__service.serviceId",
      "@input",
      "@input.icon",
      "@input.title",
      "@input.url",
      "@options",
      "@options.foo",
    ]);
    expect(
      [...analysis.knownVars.get("extension.blockPipeline.0").values()].every(
        (x) => x === VarExistence.DEFINITELY
      )
    ).toBeTrue();
  });

  test("collects the output key", async () => {
    const extension = formStateFactory(undefined, [
      blockConfigFactory({
        outputKey: validateOutputKey("foo"),
      }),
      blockConfigFactory(),
    ]);

    const analysis = new VarAnalysis();
    await analysis.run(extension);

    expect(
      analysis.knownVars.get("extension.blockPipeline.0").get("@foo")
    ).toBeUndefined();

    expect(
      analysis.knownVars.get("extension.blockPipeline.1").get("@foo")
    ).toBe(VarExistence.DEFINITELY);
    expect(
      analysis.knownVars.get("extension.blockPipeline.1").get("@foo.*")
    ).toBe(VarExistence.MAYBE);
  });

  test("collects the output key of a conditional block", async () => {
    const extension = formStateFactory(undefined, [
      blockConfigFactory({
        if: false,
        outputKey: validateOutputKey("foo"),
      }),
      blockConfigFactory(),
    ]);

    const analysis = new VarAnalysis();
    await analysis.run(extension);

    expect(
      analysis.knownVars.get("extension.blockPipeline.0").get("@foo")
    ).toBeUndefined();

    expect(
      analysis.knownVars.get("extension.blockPipeline.1").get("@foo")
    ).toBe(VarExistence.MAYBE);
    expect(
      analysis.knownVars.get("extension.blockPipeline.1").get("@foo.*")
    ).toBe(VarExistence.MAYBE);
  });

  describe("if-else brick", () => {
    let analysis: VarAnalysis;
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

      analysis = new VarAnalysis();
      await analysis.run(extension);
    });

    test("adds if-else output after the brick", async () => {
      expect(
        analysis.knownVars.get("extension.blockPipeline.1").get("@ifOutput")
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
          analysis.knownVars.get(blockPath).get("@ifOutput")
        ).toBeUndefined();
      }
    );

    test("doesn't leak sub pipeline outputs", async () => {
      expect(
        analysis.knownVars.get("extension.blockPipeline.1").get("@foo")
      ).toBeUndefined();
      expect(
        analysis.knownVars.get("extension.blockPipeline.1").get("@bar")
      ).toBeUndefined();
    });
  });

  describe("for-each brick", () => {
    let analysis: VarAnalysis;
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

      analysis = new VarAnalysis();
      await analysis.run(extension);
    });

    test("adds for-each output after the brick", async () => {
      expect(
        analysis.knownVars
          .get("extension.blockPipeline.1")
          .get("@forEachOutput")
      ).toBe(VarExistence.DEFINITELY);
    });

    test.each([
      "extension.blockPipeline.0.config.body.__value__.0",
      "extension.blockPipeline.0.config.body.__value__.1",
    ])(
      "doesn't add for-each output to sub pipelines (%s)",
      async (blockPath) => {
        expect(
          analysis.knownVars.get(blockPath).get("@forEachOutput")
        ).toBeUndefined();
      }
    );

    test("doesn't leak sub pipeline outputs", async () => {
      expect(
        analysis.knownVars.get("extension.blockPipeline.1").get("@foo")
      ).toBeUndefined();
    });

    test("adds the element key to the sub pipeline", async () => {
      expect(
        analysis.knownVars
          .get("extension.blockPipeline.0.config.body.__value__.0")
          .get("@element")
      ).toBe(VarExistence.DEFINITELY);
    });

    test("doesn't leak the sub pipeline element key", async () => {
      expect(
        analysis.knownVars.get("extension.blockPipeline.1").get("@element")
      ).toBeUndefined();
    });
  });
});
