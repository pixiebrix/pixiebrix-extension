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
import { AnalysisVisitorABC } from "./baseAnalysisVisitors";
import { castConstantCondition } from "@/runtime/runtimeUtils";
import { isTemplateExpression } from "@/utils/expressionUtils";
import { isNullOrBlank } from "@/utils/stringUtils";
import { AnnotationType } from "@/types/annotationTypes";
import { AnalysisAnnotationActionType } from "@/analysis/analysisTypes";

class ConditionAnalysis extends AnalysisVisitorABC {
  get id() {
    return "condition";
  }

  override visitBrick(
    position: BrickPosition,
    brickConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    super.visitBrick(position, brickConfig, extra);

    const conditionPosition = nestedPosition(position, "if");
    const condition = brickConfig.if;

    if (castConstantCondition(condition) != null) {
      if (
        isTemplateExpression(condition) &&
        isNullOrBlank(condition.__value__)
      ) {
        this.annotations.push({
          position: conditionPosition,
          message:
            "Blank conditions are considered falsy. Did you mean to exclude the condition?",
          analysisId: this.id,
          type: AnnotationType.Warning,
          actions: [
            {
              caption: "Exclude Condition",
              type: AnalysisAnnotationActionType.UnsetValue,
              path: conditionPosition.path,
            },
          ],
        });
      } else if (castConstantCondition(condition)) {
        this.annotations.push({
          position: conditionPosition,
          message:
            "Constant truthy condition found. The brick will always run. Did you mean to exclude the condition?",
          analysisId: this.id,
          type: AnnotationType.Info,
          actions: [
            {
              caption: "Exclude Condition",
              type: AnalysisAnnotationActionType.UnsetValue,
              path: conditionPosition.path,
            },
          ],
        });
      } else {
        this.annotations.push({
          position: conditionPosition,
          message: "Constant falsy condition found. The brick will never run",
          analysisId: this.id,
          type: AnnotationType.Info,
        });
      }
    }
  }
}

export default ConditionAnalysis;
