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
import { PipelineExpression } from "@/runtime/mapArgs";
import { blockConfigFactory, pipelineFactory } from "@/testUtils/factories";
import { toExpression } from "@/testUtils/testHelpers";
import { traversePipeline } from "./utils";

describe("traversePipeline", () => {
  test("should invoke the callback for the pipeline bricks", () => {
    const pipeline = pipelineFactory();
    const visitBlock = jest.fn();

    traversePipeline({ blockPipeline: pipeline, visitBlock });

    expect(visitBlock).toHaveBeenCalledTimes(pipeline.length);
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: pipeline[0],
      index: 0,
      path: "0",
      pipelinePath: "",
      pipeline,
      parentNodeId: null,
    });
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: pipeline[1],
      index: 1,
      path: "1",
      pipelinePath: "",
      pipeline,
      parentNodeId: null,
    });
  });

  test("should invoke the callback for the sub pipeline bricks", () => {
    const subPipeline = pipelineFactory();
    const forEachBrick = blockConfigFactory({
      id: ForEach.BLOCK_ID,
      config: {
        elements: toExpression("var", "@elements"),
        body: toExpression("pipeline", subPipeline),
      },
    });
    const pipeline = [forEachBrick];

    const visitBlock = jest.fn();

    traversePipeline({ blockPipeline: pipeline, visitBlock });

    expect(visitBlock).toHaveBeenCalledTimes(
      pipeline.length + subPipeline.length
    );
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: forEachBrick,
      index: 0,
      path: "0",
      pipelinePath: "",
      pipeline,
      parentNodeId: null,
    });
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: subPipeline[0],
      index: 0,
      path: "0.config.body.__value__.0",
      pipelinePath: "0.config.body.__value__",
      pipeline: subPipeline,
      parentNodeId: forEachBrick.instanceId,
    });
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: subPipeline[1],
      index: 1,
      path: "0.config.body.__value__.1",
      pipelinePath: "0.config.body.__value__",
      pipeline: subPipeline,
      parentNodeId: forEachBrick.instanceId,
    });
  });

  test("should invoke pre sub pipeline callback", () => {
    const subPipeline = pipelineFactory();
    const forEachBrick = blockConfigFactory({
      id: ForEach.BLOCK_ID,
      config: {
        elements: toExpression("var", "@elements"),
        body: toExpression("pipeline", subPipeline),
      },
    });
    const pipeline = [forEachBrick];
    const visitBlock = jest.fn();
    const preTraverseSubPipeline = jest.fn().mockReturnValue(true);

    traversePipeline({
      blockPipeline: pipeline,
      visitBlock,
      preTraverseSubPipeline,
    });

    expect(preTraverseSubPipeline).toHaveBeenCalledTimes(1);
    expect(preTraverseSubPipeline).toHaveBeenCalledWith({
      parentBlock: forEachBrick,
      subPipelineProperty: "config.body",
    });
  });

  test("should not invoke visitBlock when canceled by preTraverseSubPipeline", () => {
    const subPipeline = pipelineFactory();
    const forEachBrick = blockConfigFactory({
      id: ForEach.BLOCK_ID,
      config: {
        elements: toExpression("var", "@elements"),
        body: toExpression("pipeline", subPipeline),
      },
    });
    const pipeline = [forEachBrick];
    const visitBlock = jest.fn();
    const preTraverseSubPipeline = jest.fn().mockReturnValue(false);

    traversePipeline({
      blockPipeline: pipeline,
      visitBlock,
      preTraverseSubPipeline,
    });

    expect(visitBlock).toHaveBeenCalledTimes(pipeline.length);
  });

  test("should invoke the callback for the Document button pipeline", () => {
    const buttonElement = createNewElement("button");
    const subPipeline = buttonElement.config.onClick as PipelineExpression;
    subPipeline.__value__.push(blockConfigFactory());
    const containerElement = createNewElement("container");
    containerElement.children[0].children[0].children.push(buttonElement);
    const documentBrick = blockConfigFactory({
      id: DocumentRenderer.BLOCK_ID,
      config: {
        body: [containerElement],
      },
    });
    const pipeline = [documentBrick];

    const visitBlock = jest.fn();

    traversePipeline({ blockPipeline: pipeline, visitBlock });
    expect(visitBlock).toHaveBeenCalledTimes(2); // One Document brick and one brick in the pipeline
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: documentBrick,
      index: 0,
      path: "0",
      pipelinePath: "",
      pipeline,
      parentNodeId: null,
    });
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: subPipeline.__value__[0],
      index: 0,
      path: "0.config.body.0.children.0.children.0.children.0.config.onClick.__value__.0",
      pipelinePath:
        "0.config.body.0.children.0.children.0.children.0.config.onClick.__value__",
      pipeline: subPipeline.__value__,
      parentNodeId: documentBrick.instanceId,
    });
  });

  test("should invoke the callback for the Document brick pipeline", () => {
    const brickElement = createNewElement("pipeline");
    const subPipeline = brickElement.config.pipeline as PipelineExpression;
    subPipeline.__value__.push(blockConfigFactory());
    const containerElement = createNewElement("container");
    containerElement.children[0].children[0].children.push(brickElement);
    const documentBrick = blockConfigFactory({
      id: DocumentRenderer.BLOCK_ID,
      config: {
        body: [containerElement],
      },
    });
    const pipeline = [documentBrick];

    const visitBlock = jest.fn();

    traversePipeline({ blockPipeline: pipeline, visitBlock });
    expect(visitBlock).toHaveBeenCalledTimes(2); // One Document brick and one brick in the pipeline
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: documentBrick,
      index: 0,
      path: "0",
      pipelinePath: "",
      pipeline,
      parentNodeId: null,
    });
    expect(visitBlock).toHaveBeenCalledWith({
      blockConfig: subPipeline.__value__[0],
      index: 0,
      path: "0.config.body.0.children.0.children.0.children.0.config.pipeline.__value__.0",
      pipelinePath:
        "0.config.body.0.children.0.children.0.children.0.config.pipeline.__value__",
      pipeline: subPipeline.__value__,
      parentNodeId: documentBrick.instanceId,
    });
  });
});
