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
import { Template } from "nunjucks";

const TEMPLATE_ERROR_MESSAGE =
  "Invalid text template. Read more about text templates: https://docs.pixiebrix.com/nunjucks-templates";

type PushAnnotationArgs = {
  position: BlockPosition;
  expression: Expression<unknown>;
};

class TemplateAnalysis extends AnalysisVisitor {
  get id() {
    return "template";
  }

  private pushErrorAnnotation({ position, expression }: PushAnnotationArgs) {
    this.annotations.push({
      position,
      message: TEMPLATE_ERROR_MESSAGE,
      analysisId: this.id,
      type: AnnotationType.Error,
      detail: expression,
    });
  }

  override visitExpression(
    position: BlockPosition,
    expression: Expression<unknown>
  ): void {
    if (!isTemplateExpression(expression)) {
      return;
    }

    // We don't want to show duplicated message,
    // even if both conditions are true
    if (
      expression.__type__ !== "mustache" &&
      isMustacheOnly(expression.__value__)
    ) {
      this.pushErrorAnnotation({ position, expression });
    } else if (expression.__type__ === "nunjucks") {
      try {
        // eslint-disable-next-line no-new
        new Template(expression.__value__, undefined, undefined, true);
      } catch {
        this.pushErrorAnnotation({ position, expression });
      }
    }
  }
}

export default TemplateAnalysis;
