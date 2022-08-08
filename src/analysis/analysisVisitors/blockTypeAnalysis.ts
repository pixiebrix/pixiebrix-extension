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
import { VisitBlockExtra } from "@/blocks/PipelineVisitor";
import { makeIsBlockAllowedForPipeline } from "@/pageEditor/tabs/editTab/blockFilterHelpers";

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
    const isBlockAllowed = makeIsBlockAllowedForPipeline(extra.pipelineFlavor)(
      typedBlock
    );

    if (!isBlockAllowed) {
      this.annotations.push({
        position,
        message: `Block of type "${typedBlock.type}" is not allowed in this pipeline`,
        analysisId: this.id,
        type: AnnotationType.Error,
      });
    }
  }
}

export default BlockTypeAnalysis;
