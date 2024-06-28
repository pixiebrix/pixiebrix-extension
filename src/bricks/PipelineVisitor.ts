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

import {
  type BrickConfig,
  type BrickPosition,
  PipelineFlavor,
} from "@/bricks/types";
import { type UUID } from "@/types/stringTypes";
import { type TypedBrickPair } from "@/bricks/registry";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { getDocumentBuilderPipelinePaths } from "@/pageEditor/utils";
import { get } from "lodash";
import {
  getRootPipelineFlavor,
  getSubPipelineFlavor,
} from "@/bricks/brickFilterHelpers";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { isPipelineExpression } from "@/utils/expressionUtils";
import { joinPathParts } from "@/utils/formUtils";

export const ROOT_POSITION = Object.freeze({
  path: PIPELINE_BLOCKS_FIELD_NAME,
}) as BrickPosition;

export function nestedPosition(
  position: BrickPosition,
  ...rest: string[]
): BrickPosition {
  return {
    path: joinPathParts(position.path, ...rest),
  };
}

export type VisitBlockExtra = {
  index: number;
  parentNodeId?: UUID | undefined;
  pipeline: BrickConfig[];
  pipelinePosition: BrickPosition;
  pipelineFlavor: PipelineFlavor;
};
export type VisitResolvedBlockExtra = VisitBlockExtra & {
  typedBlock: TypedBrickPair;
};
export type VisitPipelineExtra = {
  /**
   * The pipeline flavor
   */
  flavor: PipelineFlavor;

  /**
   * Parent block of the pipeline, if any
   */
  parentNode?: BrickConfig | undefined;

  /**
   * Parent block of the pipeline, if any
   */
  parentPosition?: BrickPosition | undefined;

  /**
   * Name (e.g., body/action) of the parent block's property that contains the pipeline
   */
  pipelinePropName?: string | undefined;
};
type VisitRootPipelineExtra = {
  extensionPointType: StarterBrickType;
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
  public visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    _extra: VisitBlockExtra,
  ): void {
    if (blockConfig.id === DocumentRenderer.BRICK_ID) {
      this.visitDocument(position, blockConfig);
      return;
    }

    for (const [prop, value] of Object.entries(blockConfig.config)) {
      if (isPipelineExpression(value)) {
        const pipelinePosition = nestedPosition(
          position,
          "config",
          prop,
          "__value__",
        );
        const pipelineFlavor = getSubPipelineFlavor(
          blockConfig.id,
          pipelinePosition.path,
        );
        this.visitPipeline(pipelinePosition, value.__value__, {
          flavor: pipelineFlavor,
          parentNode: blockConfig,
          parentPosition: position,
          pipelinePropName: prop,
        });
      }
    }
  }

  public visitDocument(
    position: BrickPosition,
    blockConfig: BrickConfig,
  ): void {
    const subPipelineProperties = getDocumentBuilderPipelinePaths(blockConfig);
    for (const subPipelineProperty of subPipelineProperties) {
      const subPipelineAccessor = joinPathParts(
        subPipelineProperty,
        "__value__",
      );

      const subPipeline: BrickConfig[] = get(blockConfig, subPipelineAccessor);
      if (subPipeline?.length > 0) {
        const pipelinePosition = nestedPosition(position, subPipelineAccessor);
        const pipelineFlavor = getSubPipelineFlavor(
          blockConfig.id,
          pipelinePosition.path,
        );
        this.visitPipeline(pipelinePosition, subPipeline, {
          flavor: pipelineFlavor,
          parentNode: blockConfig,
          parentPosition: position,
        });
      }
    }
  }

  /**
   * Run the visitor on a pipeline; loop over the blocks
   * @param position Position of the pipeline in the extension
   * @param pipeline The pipeline to analyze
   * @param extra Extra information about the pipeline
   */
  public visitPipeline(
    position: BrickPosition,
    pipeline: BrickConfig[],
    { flavor, parentNode }: VisitPipelineExtra,
  ): void {
    for (const [index, blockConfig] of pipeline.entries()) {
      this.visitBrick(nestedPosition(position, String(index)), blockConfig, {
        index,
        parentNodeId: parentNode?.instanceId,
        pipeline,
        pipelinePosition: position,
        pipelineFlavor: flavor,
      });
    }
  }

  public visitRootPipeline(
    pipeline: BrickConfig[],
    extra?: VisitRootPipelineExtra,
  ): void {
    const flavor = extra?.extensionPointType
      ? getRootPipelineFlavor(extra.extensionPointType)
      : PipelineFlavor.AllBricks;
    this.visitPipeline(ROOT_POSITION, pipeline, { flavor });
  }
}

export default PipelineVisitor;
