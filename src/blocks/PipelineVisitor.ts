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
import { Expression, Schema } from "@/core";
import blockRegistry, { TypedBlock } from "@/blocks/registry";
import { isExpression, isPipelineExpression } from "@/runtime/mapArgs";
import { JsonValue } from "type-fest";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { getDocumentPipelinePaths } from "@/pageEditor/utils";
import { get } from "lodash";
import {
  getRootPipelineFlavor,
  getSubPipelineFlavor,
} from "@/pageEditor/tabs/editTab/blockFilterHelpers";
import { ExtensionPointType } from "@/extensionPoints/types";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";

export const ROOT_POSITION = Object.freeze({
  path: PIPELINE_BLOCKS_FIELD_NAME,
}) as BlockPosition;

export function nestedPosition(
  position: BlockPosition,
  ...rest: string[]
): BlockPosition {
  return {
    path: joinPathParts(position.path, ...rest),
  };
}

export type VisitBlockExtra = {
  index: number;
  pipelineFlavor: PipelineFlavor;
};
export type VisitResolvedBlockExtra = VisitBlockExtra & {
  typedBlock: TypedBlock;
};
export type VisitPipelineExtra = {
  flavor: PipelineFlavor;
};
export type VisitRootPipelineExtra = {
  extensionPointType: ExtensionPointType;
};

/**
 * A base class for traversing a block pipeline.
 */
class PipelineVisitor {
  /**
   * Visit a configured block.
   * @param position the position in the extension
   * @param blockConfig the block configuration
   */
  protected visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    extra: VisitBlockExtra
  ): void {
    if (blockConfig.id === DocumentRenderer.BLOCK_ID) {
      this.visitRenderDocument(position, blockConfig);
      return;
    }

    for (const [prop, value] of Object.entries(blockConfig.config)) {
      if (isPipelineExpression(value)) {
        const pipelinePosition = nestedPosition(
          position,
          "config",
          prop,
          "__value__"
        );
        const pipelineFlavor = getSubPipelineFlavor(
          blockConfig.id,
          pipelinePosition.path
        );
        this.visitPipeline(pipelinePosition, value.__value__, {
          flavor: pipelineFlavor,
        });
      } else if (isExpression(value)) {
        // TODO:
        // 1. Handle anyOf/oneOf/allOf
        this.visitExpression(
          nestedPosition(position, "config", prop),
          value
        );
      } else {
        // TODO:
        // 1. Handle anyOf/oneOf/allOf
        this.visitLiteral(
          nestedPosition(position, "config", prop),
          value as JsonValue
        );
      }
    }
  }

  public visitRenderDocument(
    position: BlockPosition,
    blockConfig: BlockConfig
  ): void {
    const subPipelineProperties = getDocumentPipelinePaths(blockConfig);
    for (const subPipelineProperty of subPipelineProperties) {
      const subPipelineAccessor = joinPathParts(
        subPipelineProperty,
        "__value__"
      );

      const subPipeline = get(blockConfig, subPipelineAccessor);
      if (subPipeline?.length > 0) {
        const pipelinePosition = nestedPosition(position, subPipelineAccessor);
        const pipelineFlavor = getSubPipelineFlavor(
          blockConfig.id,
          pipelinePosition.path
        );
        this.visitPipeline(pipelinePosition, subPipeline, {
          flavor: pipelineFlavor,
        });
      }
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- for the args in methods, subclass will override */
  public visitExpression(
    position: BlockPosition,
    expression: Expression<unknown>
  ): void {
    // NOP
  }

  public visitLiteral(position: BlockPosition, value: JsonValue): void {
    // NOP
  }

  public visitPipeline(
    position: BlockPosition,
    pipeline: BlockConfig[],
    { flavor }: VisitPipelineExtra
  ): void {
    for (const [index, blockConfig] of pipeline.entries()) {
      this.visitBlock(nestedPosition(position, String(index)), blockConfig, {
        index,
        pipelineFlavor: flavor,
      });
    }
  }

  public visitRootPipeline(
    pipeline: BlockConfig[],
    { extensionPointType }: VisitRootPipelineExtra
  ): void {
    const flavor = getRootPipelineFlavor(extensionPointType);
    this.visitPipeline(ROOT_POSITION, pipeline, { flavor });
  }
}

export default PipelineVisitor;
