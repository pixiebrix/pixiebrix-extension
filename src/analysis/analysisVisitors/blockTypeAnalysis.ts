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

import { AnalysisVisitorWithResolvedBlocks } from "./baseAnalysisVisitors";
import { type BlockConfig, type BlockPosition } from "@/blocks/types";
import { type VisitBlockExtra } from "@/blocks/PipelineVisitor";
import { makeIsBlockAllowedForPipeline } from "@/blocks/blockFilterHelpers";
import { AnnotationType } from "@/types/annotationTypes";
import TourStepTransformer from "@/blocks/transformers/tourStep/tourStep";
import { TourEffect } from "@/blocks/effects/tourEffect";

class BlockTypeAnalysis extends AnalysisVisitorWithResolvedBlocks {
  get id() {
    return "blockType";
  }

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ) {
    super.visitBlock(position, blockConfig, extra);

    const typedBlock = this.allBlocks.get(blockConfig.id);
    if (typedBlock == null) {
      return;
    }

    const isBlockAllowed = makeIsBlockAllowedForPipeline(extra.pipelineFlavor)(
      typedBlock
    );

    if (
      blockConfig.id === TourStepTransformer.BLOCK_ID &&
      this.extension.type !== "tour"
    ) {
      this.annotations.push({
        position,
        message: "The Show Tour Step brick can only be used in a Tour",
        analysisId: this.id,
        type: AnnotationType.Error,
      });
    } else if (
      blockConfig.id === TourEffect.BLOCK_ID &&
      this.extension.type === "tour"
    ) {
      this.annotations.push({
        position,
        message: "Use the Show Tour Step brick inside a Tour",
        analysisId: this.id,
        type: AnnotationType.Error,
      });
    }

    if (!isBlockAllowed) {
      this.annotations.push({
        position,
        message: `Brick of type "${typedBlock.type}" is not allowed in this pipeline`,
        analysisId: this.id,
        type: AnnotationType.Error,
      });
    }
  }
}

export default BlockTypeAnalysis;
