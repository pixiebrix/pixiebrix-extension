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
import { blockConfigFactory, pipelineFactory } from "@/testUtils/factories";
import { toExpression } from "@/testUtils/testHelpers";
import { traversePipeline } from "./editHelpers";

describe("traversePipeline", () => {
  test("should invoke the callback for the pipeline bricks", () => {
    const pipeline = pipelineFactory();
    const action = jest.fn();

    traversePipeline(pipeline, "", action);

    expect(action).toHaveBeenCalledTimes(pipeline.length);
    expect(action).toHaveBeenCalledWith(pipeline[0], 0, "0", "", pipeline);
    expect(action).toHaveBeenCalledWith(pipeline[1], 1, "1", "", pipeline);
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

    const action = jest.fn();

    traversePipeline(pipeline, "", action);
    expect(action).toHaveBeenCalledTimes(pipeline.length + subPipeline.length);
    expect(action).toHaveBeenCalledWith(
      subPipeline[0],
      0,
      "0.config.body.__value__.0",
      "0.config.body.__value__",
      subPipeline
    );
    expect(action).toHaveBeenCalledWith(
      subPipeline[1],
      1,
      "0.config.body.__value__.1",
      "0.config.body.__value__",
      subPipeline
    );
  });

  test("should invoke the callback for the Document button pipeline", () => {
    const buttonElement = createNewElement("button");
    const containerElement = createNewElement("container");
    containerElement.children[0].children[0].children.push(buttonElement);
    const documentBrick = blockConfigFactory({
      id: DocumentRenderer.BLOCK_ID,
      config: {
        body: [containerElement],
      },
    });
    const pipeline = [documentBrick];

    const action = jest.fn();

    traversePipeline(pipeline, "", action);
    expect(action).toHaveBeenCalledTimes(2); // One Document brick and one brick in the pipeline
    expect(action).toHaveBeenCalledWith(documentBrick, 0, "0", "", pipeline);
    expect(action).toHaveBeenCalledWith(
      // @ts-expect-error - onClick is a valid pipeline
      buttonElement.config.onClick.__value__[0],
      0,
      "0.config.body.0.children.0.children.0.children.0.config.onClick.__value__.0",
      "0.config.body.0.children.0.children.0.children.0.config.onClick.__value__",
      // @ts-expect-error - onClick is a valid pipeline
      buttonElement.config.onClick.__value__
    );
  });

  test("should invoke the callback for the Document brick pipeline", () => {
    const brickElement = createNewElement("pipeline");
    const containerElement = createNewElement("container");
    containerElement.children[0].children[0].children.push(brickElement);
    const documentBrick = blockConfigFactory({
      id: DocumentRenderer.BLOCK_ID,
      config: {
        body: [containerElement],
      },
    });
    const pipeline = [documentBrick];

    const action = jest.fn();

    traversePipeline(pipeline, "", action);
    expect(action).toHaveBeenCalledTimes(2); // One Document brick and one brick in the pipeline
    expect(action).toHaveBeenCalledWith(documentBrick, 0, "0", "", pipeline);
    expect(action).toHaveBeenCalledWith(
      // @ts-expect-error - pipeline is a valid pipeline
      brickElement.config.pipeline.__value__[0],
      0,
      "0.config.body.0.children.0.children.0.children.0.config.pipeline.__value__.0",
      "0.config.body.0.children.0.children.0.children.0.config.pipeline.__value__",
      // @ts-expect-error - pipeline is a valid pipeline
      brickElement.config.pipeline.__value__
    );
  });
});
