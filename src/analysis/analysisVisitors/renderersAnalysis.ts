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

import { AnalysisVisitorWithResolvedBlocks } from "./baseAnalysisVisitors";
import { AnnotationType } from "@/analysis/analysisTypes";
import { BlockConfig, BlockPosition } from "@/blocks/types";
import { nestedPosition, VisitPipelineExtra } from "@/blocks/PipelineVisitor";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";

export const MULTIPLE_RENDERERS_ERROR_MESSAGE =
  "A panel can only have one renderer. There are one or more other renderers configured for this extension.";
export const RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE =
  "A renderer must be the last brick.";

class RenderersAnalysis extends AnalysisVisitorWithResolvedBlocks {
  get id() {
    return "renderers";
  }

  public override visitPipeline(
    position: BlockPosition,
    pipeline: BlockConfig[],
    extra: VisitPipelineExtra
  ): void {
    // Validating position only if renderers are allowed in this pipeline
    // A non-renderer pipeline can't have sub-pipelines that allow renderers
    if (extra.flavor === PipelineFlavor.NoRenderer) {
      return;
    }

    let lastRendererIndex = -1;
    for (let blockIndex = pipeline.length - 1; blockIndex >= 0; --blockIndex) {
      const pipelineBlock = pipeline.at(blockIndex);
      const blockType = this.allBlocks.get(pipelineBlock.id)?.type;
      const blockErrors = [];

      if (blockType !== "renderer") {
        continue;
      }

      if (lastRendererIndex !== -1) {
        blockErrors.push(MULTIPLE_RENDERERS_ERROR_MESSAGE);

        // Push error annotation for the other renderer,
        // which was found before this one
        this.annotations.push({
          position: nestedPosition(position, String(lastRendererIndex)),
          message: MULTIPLE_RENDERERS_ERROR_MESSAGE,
          analysisId: this.id,
          type: AnnotationType.Error,
        });
      } else {
        lastRendererIndex = blockIndex;
      }

      if (blockIndex !== pipeline.length - 1) {
        blockErrors.push(RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE);
      }

      for (const message of blockErrors) {
        this.annotations.push({
          position: nestedPosition(position, String(blockIndex)),
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
