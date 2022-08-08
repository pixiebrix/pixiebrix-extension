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

import { Expression } from "@/core";
import { AnnotationType } from "@/analysis/analysisTypes";
import { BlockPosition } from "@/blocks/types";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { isMustacheOnly } from "@/components/fields/fieldUtils";
import { AnalysisVisitor } from "./baseAnalysisVisitors";

const TEMPLATE_ERROR_MESSAGE =
  "Invalid text template. Read more about text templates: https://docs.pixiebrix.com/nunjucks-templates";

class TemplateAnalysis extends AnalysisVisitor {
  get id() {
    return "template";
  }

  override async visitExpression(
    position: BlockPosition,
    expression: Expression<unknown>
  ): Promise<void> {
    if (
      isTemplateExpression(expression) &&
      expression.__type__ !== "mustache" &&
      isMustacheOnly(expression.__value__)
    ) {
      this.annotations.push({
        position,
        message: TEMPLATE_ERROR_MESSAGE,
        analysisId: this.id,
        type: AnnotationType.Error,
        detail: expression,
      });
    }
  }
}

export default TemplateAnalysis;
