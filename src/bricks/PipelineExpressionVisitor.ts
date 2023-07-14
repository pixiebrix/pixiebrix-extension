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

import { type BrickConfig, type BrickPosition } from "@/bricks/types";
import { joinPathParts } from "@/utils";
import { type Expression } from "@/types/runtimeTypes";
import PipelineVisitor, {
  nestedPosition,
  type VisitBlockExtra,
} from "./PipelineVisitor";
import { type DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";
import { isExpression, isPipelineExpression } from "@/utils/expressionUtils";

export type VisitDocumentElementArgs = {
  /**
   * The position of document builder block within the mod
   */
  position: BrickPosition;
  /**
   * The document builder config
   */
  blockConfig: BrickConfig;
  /**
   * The element at path `pathInBlock` within the document builder config
   */
  element: DocumentElement;
  /**
   * The path to the element within the document builder config
   */
  pathInBlock: string;
};

/**
 * A base class for traversing a block pipeline.
 */
abstract class PipelineExpressionVisitor extends PipelineVisitor {
  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra
  ): void {
    super.visitBrick(position, blockConfig, extra);

    if (isExpression(blockConfig.if)) {
      this.visitExpression(nestedPosition(position, "if"), blockConfig.if);
    }

    for (const [prop, value] of Object.entries(blockConfig.config)) {
      if (isExpression(value)) {
        // TODO: Handle anyOf/oneOf/allOf
        this.visitExpression(nestedPosition(position, "config", prop), value);
      }
    }
  }

  public override visitDocument(
    position: BrickPosition,
    blockConfig: BrickConfig
  ): void {
    super.visitDocument(position, blockConfig);
    for (const [index, element] of Object.entries(blockConfig.config.body)) {
      this.visitDocumentElement({
        position,
        blockConfig,
        element,
        pathInBlock: `config.body.${index}`,
      });
    }
  }

  private getPipelineFlavor(elementType: string): PipelineFlavor {
    switch (elementType) {
      case "block": {
        return PipelineFlavor.NoEffect;
      }

      case "button": {
        return PipelineFlavor.NoRenderer;
      }

      default: {
        return PipelineFlavor.AllBlocks;
      }
    }
  }

  public visitDocumentElement({
    position,
    blockConfig,
    element,
    pathInBlock,
  }: VisitDocumentElementArgs) {
    for (const [prop, value] of Object.entries(element.config)) {
      if (isPipelineExpression(value)) {
        this.visitPipeline(
          // For pipelines, need to include the __value__ when constructing the position
          nestedPosition(position, pathInBlock, "config", prop, "__value__"),
          value.__value__,
          {
            flavor: this.getPipelineFlavor(element.type),
            parentNode: blockConfig,
          }
        );
      } else if (isExpression(value)) {
        this.visitExpression(
          nestedPosition(position, pathInBlock, "config", prop),
          value
        );
      }
    }

    if (element.children?.length) {
      for (const [index, childElement] of Object.entries(element.children)) {
        this.visitDocumentElement({
          position,
          blockConfig,
          element: childElement,
          pathInBlock: joinPathParts(pathInBlock, "children", index),
        });
      }
    }
  }

  /**
   * Visits an expression in a block
   * @param position Position of the expression (including expression prop name in the block)
   * @param expression The expression to visit
   */
  abstract visitExpression(
    position: BrickPosition,
    expression: Expression<unknown>
  ): void;
}

export default PipelineExpressionVisitor;
