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

import { DocumentRenderer } from "@/blocks/renderers/document";
import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { PipelineExpression } from "@/runtime/mapArgs";
import { blockConfigFactory, pipelineFactory } from "@/testUtils/factories";
import { toExpression } from "@/testUtils/testHelpers";
import { getPipelineMap } from "./editHelpers";

describe("getPipelineMap", () => {
  test("should map plain pipeline", () => {
    const pipeline = pipelineFactory();
    const pipelineMap = getPipelineMap(pipeline);

    expect(Object.keys(pipelineMap).length).toBe(2);

    const firstBlock = pipeline[0];
    expect(pipelineMap[firstBlock.instanceId]).toEqual({
      blockId: firstBlock.id,
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0`,
      blockConfig: firstBlock,
      index: 0,
      pipeline,
      pipelinePath: PIPELINE_BLOCKS_FIELD_NAME,
      parentNodeId: undefined,
    });

    const secondBlock = pipeline[1];
    expect(pipelineMap[secondBlock.instanceId]).toEqual({
      blockId: secondBlock.id,
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.1`,
      blockConfig: secondBlock,
      index: 1,
      pipeline,
      pipelinePath: PIPELINE_BLOCKS_FIELD_NAME,
      parentNodeId: undefined,
    });
  });

  test("should map pipeline with sub pipeline", () => {
    const subPipeline = pipelineFactory();
    const forEachBrick = blockConfigFactory({
      id: ForEach.BLOCK_ID,
      config: {
        elements: toExpression("var", "@elements"),
        body: toExpression("pipeline", subPipeline),
      },
    });
    const pipeline = [forEachBrick];

    const pipelineMap = getPipelineMap(pipeline);

    expect(Object.keys(pipelineMap).length).toBe(3);

    const subPipelineFirstBlock = subPipeline[0];

    expect(pipelineMap[subPipelineFirstBlock.instanceId]).toEqual({
      blockId: subPipelineFirstBlock.id,
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.__value__.0`,
      blockConfig: subPipelineFirstBlock,
      index: 0,
      pipeline: subPipeline,
      pipelinePath: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.__value__`,
      parentNodeId: forEachBrick.instanceId,
    });

    const subPipelineSecondBlock = subPipeline[1];
    expect(pipelineMap[subPipelineSecondBlock.instanceId]).toEqual({
      blockId: subPipelineSecondBlock.id,
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.__value__.1`,
      blockConfig: subPipelineSecondBlock,
      index: 1,
      pipeline: subPipeline,
      pipelinePath: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.__value__`,
      parentNodeId: forEachBrick.instanceId,
    });
  });

  test("should map pipeline with document and button", () => {
    const subPipeline = pipelineFactory();
    const buttonElement = createNewElement("button");
    (buttonElement.config.onClick as PipelineExpression).__value__ =
      subPipeline;
    const containerElement = createNewElement("container");
    containerElement.children[0].children[0].children.push(buttonElement);
    const documentBrick = blockConfigFactory({
      id: DocumentRenderer.BLOCK_ID,
      config: {
        body: [containerElement],
      },
    });
    const pipeline = [documentBrick];

    const pipelineMap = getPipelineMap(pipeline);

    expect(Object.keys(pipelineMap).length).toBe(3);

    const subPipelineFirstBlock = subPipeline[0];
    expect(pipelineMap[subPipelineFirstBlock.instanceId]).toEqual({
      blockId: subPipelineFirstBlock.id,
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__.0`,
      blockConfig: subPipelineFirstBlock,
      index: 0,
      pipeline: subPipeline,
      pipelinePath: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__`,
      parentNodeId: documentBrick.instanceId,
    });

    const subPipelineSecondBlock = subPipeline[1];
    expect(pipelineMap[subPipelineSecondBlock.instanceId]).toEqual({
      blockId: subPipelineSecondBlock.id,
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__.1`,
      blockConfig: subPipelineSecondBlock,
      index: 1,
      pipeline: subPipeline,
      pipelinePath: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__`,
      parentNodeId: documentBrick.instanceId,
    });
  });
});
