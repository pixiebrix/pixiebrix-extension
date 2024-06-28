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

import { AnalysisVisitorWithResolvedBricksABC } from "./baseAnalysisVisitors";
import {
  type BrickConfig,
  type BrickPosition,
  PipelineFlavor,
} from "@/bricks/types";
import {
  nestedPosition,
  type VisitPipelineExtra,
} from "@/bricks/PipelineVisitor";
import { AnnotationType } from "@/types/annotationTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { BrickTypes } from "@/runtime/runtimeTypes";

export const MULTIPLE_RENDERERS_ERROR_MESSAGE =
  "A panel can only have one renderer. There are one or more other renderers configured for this mod.";
const RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE =
  "A renderer must be the last brick.";

class RenderersAnalysis extends AnalysisVisitorWithResolvedBricksABC {
  get id() {
    return "renderers";
  }

  public override visitPipeline(
    position: BrickPosition,
    pipeline: BrickConfig[],
    extra: VisitPipelineExtra,
  ): void {
    // Validating position only if renderers are allowed in this pipeline
    // A non-renderer pipeline can't have sub-pipelines that allow renderers
    if (extra.flavor === PipelineFlavor.NoRenderer) {
      return;
    }

    let lastRendererIndex = -1;
    for (let brickIndex = pipeline.length - 1; brickIndex >= 0; --brickIndex) {
      const pipelineBlock = pipeline.at(brickIndex);
      assertNotNullish(
        pipelineBlock,
        `Pipeline block at index ${brickIndex} is null`,
      );
      const brickType = this.allBlocks.get(pipelineBlock.id)?.type;
      const brickErrors = [];

      if (brickType !== BrickTypes.RENDERER) {
        continue;
      }

      if (lastRendererIndex === -1) {
        lastRendererIndex = brickIndex;
      } else {
        brickErrors.push(MULTIPLE_RENDERERS_ERROR_MESSAGE);

        // Push error annotation for the other renderer,
        // which was found before this one
        this.annotations.push({
          position: nestedPosition(position, String(lastRendererIndex)),
          message: MULTIPLE_RENDERERS_ERROR_MESSAGE,
          analysisId: this.id,
          type: AnnotationType.Error,
        });
      }

      if (brickIndex !== pipeline.length - 1) {
        brickErrors.push(RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE);
      }

      for (const message of brickErrors) {
        this.annotations.push({
          position: nestedPosition(position, String(brickIndex)),
          message,
          analysisId: this.id,
          type: AnnotationType.Error,
        });
      }
    }

    super.visitPipeline(position, pipeline, extra);
  }
}

export default RenderersAnalysis;
