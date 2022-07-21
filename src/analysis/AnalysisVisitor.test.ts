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

import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import { BlockConfig } from "@/blocks/types";
import { blockConfigFactory, pipelineFactory } from "@/testUtils/factories";
import { toExpression } from "@/testUtils/testHelpers";
import { AbsolutePosition } from "./analysisTypes";
import AnalysisVisitor, { VisitBlockExtra } from "./AnalysisVisitor";

jest.mock("@/blocks/registry", () => ({
  __esModule: true,
  default: {
    async lookup() {
      return {
        inputSchema: {},
      };
    },
  },
}));

test("should invoke the callback for the pipeline bricks", async () => {
  const pipeline = pipelineFactory();
  const visitBlock = jest.fn();
  class Visitor extends AnalysisVisitor {
    override async visitBlock(
      position: AbsolutePosition,
      blockConfig: BlockConfig,
      extra: VisitBlockExtra
    ) {
      await super.visitBlock(position, blockConfig, extra);

      visitBlock(position, blockConfig, extra);
    }
  }

  const visitor = new Visitor();
  await visitor.visitRootPipeline(pipeline, { extensionType: "test" });

  expect(visitBlock).toHaveBeenCalledTimes(pipeline.length);
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: "0",
    },
    pipeline[0],
    { index: 0 }
  );
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: "1",
    },
    pipeline[1],
    { index: 1 }
  );
});

test("should invoke the callback for the sub pipeline bricks", async () => {
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

  class Visitor extends AnalysisVisitor {
    override async visitBlock(
      position: AbsolutePosition,
      blockConfig: BlockConfig,
      extra: VisitBlockExtra
    ) {
      await super.visitBlock(position, blockConfig, extra);

      visitBlock(position, blockConfig, extra);
    }
  }
  const visitor = new Visitor();
  await visitor.visitRootPipeline(pipeline, { extensionType: "test" });

  expect(visitBlock).toHaveBeenCalledTimes(
    pipeline.length + subPipeline.length
  );

  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: "0.config.body.__value__.0",
    },
    subPipeline[0],
    { index: 0 }
  );
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: "0.config.body.__value__.1",
    },
    subPipeline[1],
    { index: 1 }
  );
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: "0",
    },
    pipeline[0],
    { index: 0 }
  );
});

/*
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
    const preVisitSubPipeline = jest.fn();

    traversePipeline({
      pipeline,
      visitBlock,
      preVisitSubPipeline,
    });

    expect(preVisitSubPipeline).toHaveBeenCalledTimes(1);
    expect(preVisitSubPipeline).toHaveBeenCalledWith({
      parentBlock: forEachBrick,
      subPipelineProperty: "config.body",
    });
  });

  test.each([toExpression("pipeline", []), undefined])(
    "should not invoke visitBlock when sub pipeline is empty",
    (subPipelineProperty) => {
      const forEachBrick = blockConfigFactory({
        id: ForEach.BLOCK_ID,
        config: {
          elements: toExpression("var", "@elements"),
          body: subPipelineProperty,
        },
      });
      const pipeline = [forEachBrick];
      const visitBlock = jest.fn();

      traversePipeline({
        pipeline,
        visitBlock,
        preVisitSubPipeline: jest.fn(),
      });

      expect(visitBlock).toHaveBeenCalledTimes(pipeline.length);
    }
  );

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

    traversePipeline({ pipeline, visitBlock });
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

    traversePipeline({ pipeline, visitBlock });
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
  */
