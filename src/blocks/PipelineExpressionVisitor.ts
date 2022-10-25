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

import { BlockConfig, BlockPosition } from "@/blocks/types";
import { joinPathParts } from "@/utils";
import { Expression } from "@/core";
import { isExpression } from "@/runtime/mapArgs";
import PipelineVisitor, {
  nestedPosition,
  VisitBlockExtra,
} from "./PipelineVisitor";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";

export type VisitDocumentElementArgs = {
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
        this.visitExpression(
          nestedPosition(position, "config", prop),
          value,
          position
        );
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
          value,
          position
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

  abstract visitExpression(
    position: BlockPosition,
    expression: Expression<unknown>,
    blockPosition: BlockPosition
  ): void;
}

export default PipelineExpressionVisitor;
