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

import { type BlockConfig, type BlockPosition } from "@/blocks/types";
import { joinPathParts } from "@/utils";
import { type Expression } from "@/core";
import { isExpression } from "@/runtime/mapArgs";
import PipelineVisitor, {
  nestedPosition,
  type VisitBlockExtra,
} from "./PipelineVisitor";
import { type DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";

type VisitDocumentElementArgs = {
  position: BlockPosition;
  blockConfig: BlockConfig;
  element: DocumentElement;
  pathInBlock: string;
};

/**
 * A base class for traversing a block pipeline.
 */
abstract class PipelineExpressionVisitor extends PipelineVisitor {
  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ): void {
    super.visitBlock(position, blockConfig, extra);

    for (const [prop, value] of Object.entries(blockConfig.config)) {
      if (isExpression(value)) {
        // TODO: Handle anyOf/oneOf/allOf
        this.visitExpression(nestedPosition(position, "config", prop), value);
      }
    }
  }

  public override visitDocument(
    position: BlockPosition,
    blockConfig: BlockConfig
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

  public visitDocumentElement({
    position,
    blockConfig,
    element,
    pathInBlock,
  }: VisitDocumentElementArgs) {
    for (const [prop, value] of Object.entries(element.config)) {
      if (isExpression(value)) {
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
    position: BlockPosition,
    expression: Expression<unknown>
  ): void;
}

export default PipelineExpressionVisitor;
