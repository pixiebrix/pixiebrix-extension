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
import { type BrickPosition, type BrickConfig } from "@/bricks/types";
import { createNewDocumentBuilderElement } from "@/pageEditor/documentBuilder/createNewDocumentBuilderElement";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { type PipelineExpression } from "@/types/runtimeTypes";
import PipelineVisitor, { type VisitBlockExtra } from "./PipelineVisitor";
import {
  brickConfigFactory,
  pipelineFactory,
} from "@/testUtils/factories/brickFactories";
import { toExpression } from "@/utils/expressionUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

test("should invoke the callback for the pipeline bricks", () => {
  const pipeline = pipelineFactory();
  const visitBlock = jest.fn();
  class Visitor extends PipelineVisitor {
    override visitBrick(
      position: BrickPosition,
      blockConfig: BrickConfig,
      extra: VisitBlockExtra,
    ) {
      super.visitBrick(position, blockConfig, extra);

      visitBlock(position, blockConfig, extra);
    }
  }

  const visitor = new Visitor();
  visitor.visitRootPipeline(pipeline, {
    starterBrickType: StarterBrickTypes.BUTTON,
  });

  expect(visitBlock).toHaveBeenCalledTimes(pipeline.length);
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0`,
    },
    pipeline[0],
    {
      index: 0,
      pipelineFlavor: "noRenderer",
      parentNodeId: undefined,
      pipeline,
      pipelinePosition: { path: PIPELINE_BLOCKS_FIELD_NAME },
    },
  );
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.1`,
    },
    pipeline[1],
    {
      index: 1,
      pipelineFlavor: "noRenderer",
      parentNodeId: undefined,
      pipeline,
      pipelinePosition: { path: PIPELINE_BLOCKS_FIELD_NAME },
    },
  );
});

test("should invoke the callback for the sub pipeline bricks", () => {
  const subPipeline = pipelineFactory();
  const forEachBrick = brickConfigFactory({
    id: ForEach.BRICK_ID,
    config: {
      elements: toExpression("var", "@elements"),
      body: toExpression("pipeline", subPipeline),
    },
  });
  const pipeline = [forEachBrick];

  const visitBlock = jest.fn();

  class Visitor extends PipelineVisitor {
    override visitBrick(
      position: BrickPosition,
      blockConfig: BrickConfig,
      extra: VisitBlockExtra,
    ) {
      super.visitBrick(position, blockConfig, extra);

      visitBlock(position, blockConfig, extra);
    }
  }
  const visitor = new Visitor();
  visitor.visitRootPipeline(pipeline, {
    starterBrickType: StarterBrickTypes.BUTTON,
  });

  expect(visitBlock).toHaveBeenCalledTimes(
    pipeline.length + subPipeline.length,
  );

  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.__value__.0`,
    },
    subPipeline[0],
    {
      index: 0,
      pipelineFlavor: "noRenderer",
      parentNodeId: forEachBrick.instanceId,
      pipeline: subPipeline,
      pipelinePosition: {
        path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.__value__`,
      },
    },
  );
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.__value__.1`,
    },
    subPipeline[1],
    {
      index: 1,
      pipelineFlavor: "noRenderer",
      parentNodeId: forEachBrick.instanceId,
      pipeline: subPipeline,
      pipelinePosition: {
        path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.__value__`,
      },
    },
  );
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0`,
    },
    pipeline[0],
    {
      index: 0,
      pipelineFlavor: "noRenderer",
      parentNodeId: undefined,
      pipeline,
      pipelinePosition: { path: PIPELINE_BLOCKS_FIELD_NAME },
    },
  );
});

test("should invoke the callback for the Document button pipeline", () => {
  const buttonElement = createNewDocumentBuilderElement("button");
  const subPipeline = (buttonElement.config.onClick as PipelineExpression)
    .__value__;
  subPipeline.push(brickConfigFactory());
  const containerElement = createNewDocumentBuilderElement("container");
  containerElement.children[0].children[0].children.push(buttonElement);
  const documentBrick = brickConfigFactory({
    id: DocumentRenderer.BRICK_ID,
    config: {
      body: [containerElement],
    },
  });
  const pipeline = [documentBrick];

  const visitBlock = jest.fn();

  class Visitor extends PipelineVisitor {
    override visitBrick(
      position: BrickPosition,
      blockConfig: BrickConfig,
      extra: VisitBlockExtra,
    ) {
      super.visitBrick(position, blockConfig, extra);

      visitBlock(position, blockConfig, extra);
    }
  }
  const visitor = new Visitor();
  visitor.visitRootPipeline(pipeline, {
    starterBrickType: StarterBrickTypes.SIDEBAR_PANEL,
  });

  expect(visitBlock).toHaveBeenCalledTimes(2); // One Document brick and one brick in the pipeline
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__.0`,
    },
    subPipeline[0],
    {
      index: 0,
      pipelineFlavor: "noRenderer",
      parentNodeId: documentBrick.instanceId,
      pipeline: subPipeline,
      pipelinePosition: {
        path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.onClick.__value__`,
      },
    },
  );
  expect(visitBlock).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0`,
    },
    documentBrick,
    {
      index: 0,
      pipelineFlavor: "noEffect",
      parentNodeId: undefined,
      pipeline,
      pipelinePosition: {
        path: PIPELINE_BLOCKS_FIELD_NAME,
      },
    },
  );
});
