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

import { DocumentRenderer } from "@/blocks/renderers/document";
import { type BlockPosition, type BlockPipeline } from "@/blocks/types";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import { type Expression } from "@/types/runtimeTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { toExpression } from "@/testUtils/testHelpers";
import PipelineExpressionVisitor from "./PipelineExpressionVisitor";
import { blockConfigFactory } from "@/testUtils/factories/blockFactories";

function getTestBlock() {
  return blockConfigFactory({
    config: {
      text: toExpression("nunjucks", "test"),
    },
  });
}

test("should invoke the callback for a brick expression", () => {
  const pipeline: BlockPipeline = [getTestBlock()];

  const visitExpression = jest.fn();
  class Visitor extends PipelineExpressionVisitor {
    override visitExpression(
      position: BlockPosition,
      expression: Expression<unknown>
    ) {
      visitExpression(position, expression);
    }
  }

  const visitor = new Visitor();
  visitor.visitRootPipeline(pipeline);

  expect(visitExpression).toHaveBeenCalledTimes(pipeline.length);
  expect(visitExpression).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.text`,
    },
    {
      __type__: "nunjucks",
      __value__: "test",
    }
  );
});

test("should invoke the callback for a Document expression", () => {
  const textElement = createNewElement("text");
  textElement.config.text = toExpression("nunjucks", "test");

  const containerElement = createNewElement("container");
  containerElement.children[0].children[0].children.push(textElement);

  const documentBrick = blockConfigFactory({
    id: DocumentRenderer.BLOCK_ID,
    config: {
      body: [containerElement],
    },
  });
  const pipeline = [documentBrick];

  const visitExpression = jest.fn();
  class Visitor extends PipelineExpressionVisitor {
    override visitExpression(
      position: BlockPosition,
      expression: Expression<unknown>
    ) {
      visitExpression(position, expression);
    }
  }

  const visitor = new Visitor();
  visitor.visitRootPipeline(pipeline);

  expect(visitExpression).toHaveBeenCalledTimes(1);

  expect(visitExpression).toHaveBeenCalledWith(
    {
      path: `${PIPELINE_BLOCKS_FIELD_NAME}.0.config.body.0.children.0.children.0.children.0.config.text`,
    },
    {
      __type__: "nunjucks",
      __value__: "test",
    }
  );
});
