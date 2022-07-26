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

import { AnnotationType } from "@/analysis/analysisTypes";
import {
  nestedPosition,
  VisitResolvedBlockExtra,
} from "@/blocks/PipelineVisitor";
import { BlockConfig, BlockPosition } from "@/blocks/types";
import { BlockType } from "@/runtime/runtimeTypes";
import AnalysisVisitor from "@/analysis/AnalysisVisitor";

const outputKeyRegex = /^[A-Za-z][\dA-Za-z]*$/;

const blockTypesWithEmptyOutputKey: BlockType[] = ["effect", "renderer"];

class OutputKeyAnalysis extends AnalysisVisitor {
  get id() {
    return "outputKey";
  }

  override async visitResolvedBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitResolvedBlockExtra
  ): Promise<void> {
    await super.visitResolvedBlock(position, blockConfig, extra);

    let errorMessage: string;
    const { outputKey } = blockConfig;
    const blockType = extra.typedBlock.type;
    if (blockTypesWithEmptyOutputKey.includes(blockType)) {
      if (!outputKey) {
        return;
      }

      errorMessage = `OutputKey must be empty for "${blockType}" block.`;
    } else if (!outputKey) {
      errorMessage = "This field is required.";
    } else if (outputKeyRegex.test(outputKey)) {
      return;
    } else {
      errorMessage =
        "Must start with a letter and only include letters and numbers.";
    }

    this.annotations.push({
      position: nestedPosition(position, "outputKey"),
      message: errorMessage,
      analysisId: this.id,
      type: AnnotationType.Error,
    });
  }
}

export default OutputKeyAnalysis;
