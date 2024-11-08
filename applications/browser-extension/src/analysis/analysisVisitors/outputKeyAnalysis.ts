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

import { nestedPosition, type VisitBlockExtra } from "@/bricks/PipelineVisitor";
import { type BrickConfig, type BrickPosition } from "@/bricks/types";
import { AnalysisVisitorWithResolvedBricksABC } from "./baseAnalysisVisitors";
import { AnnotationType } from "../../types/annotationTypes";
import { brickTypeSupportsOutputKey } from "../../runtime/runtimeUtils";

const outputKeyRegex = /^[A-Za-z][\dA-Za-z]*$/;

class OutputKeyAnalysis extends AnalysisVisitorWithResolvedBricksABC {
  get id() {
    return "outputKey";
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    super.visitBrick(position, blockConfig, extra);

    let errorMessage: string;
    const { id, outputKey } = blockConfig;

    switch (outputKey) {
      case "mod": {
        this.annotations.push({
          position: nestedPosition(position, "outputKey"),
          message: "Variable name 'mod' is reserved for mod variables.",
          analysisId: this.id,
          type: AnnotationType.Warning,
        });

        break;
      }

      case "input": {
        this.annotations.push({
          position: nestedPosition(position, "outputKey"),
          message: "Variable name 'input' is reserved for the starter brick.",
          analysisId: this.id,
          type: AnnotationType.Warning,
        });

        break;
      }

      case "options": {
        this.annotations.push({
          position: nestedPosition(position, "outputKey"),
          message: "Variable name 'options' is reserved for mod options.",
          analysisId: this.id,
          type: AnnotationType.Warning,
        });

        break;
      }

      // Output key is not a reserved name
      default:
    }

    const typedBlock = this.allBlocks.get(id);
    if (typedBlock == null) {
      return;
    }

    const { type: brickType } = typedBlock;
    if (brickType && !brickTypeSupportsOutputKey(brickType)) {
      if (!outputKey) {
        return;
      }

      errorMessage = `Output variable name must be empty for "${brickType}" block.`;
    } else if (!outputKey) {
      // As of 2.0.7, outputKeys are optional
      return;
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
