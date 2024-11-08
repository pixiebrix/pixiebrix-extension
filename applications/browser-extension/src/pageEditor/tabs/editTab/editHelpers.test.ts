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

import { DocumentRenderer } from "@/bricks/renderers/document";
import ForEach from "@/bricks/transformers/controlFlow/ForEach";
import { createNewDocumentBuilderElement } from "../../documentBuilder/createNewDocumentBuilderElement";
import { PIPELINE_BRICKS_FIELD_NAME } from "../../consts";
import { type PipelineExpression } from "../../../types/runtimeTypes";
import { generateFreshOutputKey, getPipelineMap } from "./editHelpers";
import {
  brickConfigFactory,
  pipelineFactory,
} from "../../../testUtils/factories/brickFactories";
import { EchoBrick } from "../../../runtime/pipelineTests/testHelpers";
import { validateRegistryId } from "../../../types/helpers";
import { TransformerABC } from "../../../types/bricks/transformerTypes";
import { EffectABC } from "../../../types/bricks/effectTypes";
import { toExpression } from "../../../utils/expressionUtils";

describe("getPipelineMap", () => {
  test("should map plain pipeline", () => {
    const pipeline = pipelineFactory();
    const pipelineMap = getPipelineMap(pipeline);

    expect(Object.keys(pipelineMap)).toHaveLength(2);

    const firstBlock = pipeline[0];
    expect(pipelineMap[firstBlock!.instanceId!]).toEqual({
      blockId: firstBlock!.id,
      path: `${PIPELINE_BRICKS_FIELD_NAME}.0`,
      blockConfig: firstBlock,
      index: 0,
      pipeline,
      pipelinePath: PIPELINE_BRICKS_FIELD_NAME,
      parentNodeId: undefined,
    });

    const secondBlock = pipeline[1];
    expect(pipelineMap[secondBlock!.instanceId!]).toEqual({
      blockId: secondBlock!.id,
      path: `${PIPELINE_BRICKS_FIELD_NAME}.1`,
      blockConfig: secondBlock,
      index: 1,
      pipeline,
      pipelinePath: PIPELINE_BRICKS_FIELD_NAME,
      parentNodeId: undefined,
    });
  });

  test("should map pipeline with sub pipeline", () => {
    const subPipeline = pipelineFactory();
    const forEachBrick = brickConfigFactory({
      id: ForEach.BRICK_ID,
      config: {
        elements: toExpression("var", "@elements"),
        body: toExpression("pipeline", subPipeline),
      },
    });
    const pipeline = [forEachBrick];

    const pipelineMap = getPipelineMap(pipeline);

    expect(Object.keys(pipelineMap)).toHaveLength(3);

    const subPipelineFirstBlock = subPipeline[0];

    expect(pipelineMap[subPipelineFirstBlock!.instanceId!]).toEqual({
      blockId: subPipelineFirstBlock!.id,
      path: `${PIPELINE_BRICKS_FIELD_NAME}.0.config.body.__value__.0`,
      blockConfig: subPipelineFirstBlock,
      index: 0,
      pipeline: subPipeline,
      pipelinePath: `${PIPELINE_BRICKS_FIELD_NAME}.0.config.body.__value__`,
      parentNodeId: forEachBrick.instanceId,
    });

    const subPipelineSecondBlock = subPipeline[1];
    expect(pipelineMap[subPipelineSecondBlock!.instanceId!]).toEqual({
      blockId: subPipelineSecondBlock!.id,
      path: `${PIPELINE_BRICKS_FIELD_NAME}.0.config.body.__value__.1`,
      blockConfig: subPipelineSecondBlock,
      index: 1,
      pipeline: subPipeline,
      pipelinePath: `${PIPELINE_BRICKS_FIELD_NAME}.0.config.body.__value__`,
      parentNodeId: forEachBrick.instanceId,
    });
  });

  test("should map pipeline with document and button", () => {
    const subPipeline = pipelineFactory();
    const buttonElement = createNewDocumentBuilderElement("button");
    (buttonElement.config.onClick as PipelineExpression).__value__ =
      subPipeline;
    const containerElement = createNewDocumentBuilderElement("container");
    containerElement.children![0]!.children![0]!.children!.push(buttonElement);
    const documentBrick = brickConfigFactory({
      id: DocumentRenderer.BRICK_ID,
      config: {
        body: [containerElement],
      },
    });
    const pipeline = [documentBrick];

    const pipelineMap = getPipelineMap(pipeline);

    expect(Object.keys(pipelineMap)).toHaveLength(3);

    const subPipelineFirstBlock = subPipeline[0];
    expect(pipelineMap[subPipelineFirstBlock!.instanceId!]).toEqual({
      blockId: subPipelineFirstBlock!.id,
      path: `${PIPELINE_BRICKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__.0`,
      blockConfig: subPipelineFirstBlock,
      index: 0,
      pipeline: subPipeline,
      pipelinePath: `${PIPELINE_BRICKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__`,
      parentNodeId: documentBrick.instanceId,
    });

    const subPipelineSecondBlock = subPipeline[1];
    expect(pipelineMap[subPipelineSecondBlock!.instanceId!]).toEqual({
      blockId: subPipelineSecondBlock!.id,
      path: `${PIPELINE_BRICKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__.1`,
      blockConfig: subPipelineSecondBlock,
      index: 1,
      pipeline: subPipeline,
      pipelinePath: `${PIPELINE_BRICKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__`,
      parentNodeId: documentBrick.instanceId,
    });
  });
});

describe("generateFreshOutputKey", () => {
  it("should fallback to output if can't infer type", async () => {
    await expect(generateFreshOutputKey(new EchoBrick(), [])).resolves.toBe(
      "output",
    );
  });

  it("should default to output for transformer", async () => {
    class TransformerBrick extends TransformerABC {
      static BRICK_ID = validateRegistryId("test/transformer");
      constructor() {
        super(TransformerBrick.BRICK_ID, "Transformer Brick");
      }

      inputSchema = {};

      async transform() {
        return 42;
      }
    }

    await expect(
      generateFreshOutputKey(new TransformerBrick(), []),
    ).resolves.toBe("output");
  });

  it("should use declared key", async () => {
    class TransformerBrick extends TransformerABC {
      static BRICK_ID = validateRegistryId("test/transformer");
      constructor() {
        super(TransformerBrick.BRICK_ID, "Transformer Brick");
      }

      override defaultOutputKey = "foo";

      inputSchema = {};

      async transform() {
        return 42;
      }
    }

    await expect(
      generateFreshOutputKey(new TransformerBrick(), []),
    ).resolves.toBe("foo");
  });

  it("should return undefined for effect", async () => {
    class EffectBrick extends EffectABC {
      static BRICK_ID = validateRegistryId("test/effect");
      constructor() {
        super(EffectBrick.BRICK_ID, "Effect Brick");
      }

      inputSchema = {};

      async effect() {}
    }

    await expect(
      generateFreshOutputKey(new EffectBrick(), []),
    ).resolves.toBeUndefined();
  });
});
