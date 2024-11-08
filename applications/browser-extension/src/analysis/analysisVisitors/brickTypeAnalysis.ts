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
import { type BrickConfig, type BrickPosition } from "@/bricks/types";
import { type VisitBlockExtra } from "@/bricks/PipelineVisitor";
import { makeIsBrickAllowedForPipeline } from "@/bricks/brickFilterHelpers";
import { AnnotationType } from "../../types/annotationTypes";

class BrickTypeAnalysis extends AnalysisVisitorWithResolvedBricksABC {
  get id() {
    return "blockType";
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ) {
    super.visitBrick(position, blockConfig, extra);

    const typedBlock = this.allBlocks.get(blockConfig.id);
    if (typedBlock == null) {
      return;
    }

    const isBlockAllowed = makeIsBrickAllowedForPipeline(extra.pipelineFlavor)(
      typedBlock,
    );

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

export default BrickTypeAnalysis;
