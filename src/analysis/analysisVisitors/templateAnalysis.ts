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

import { type Expression } from "@/core";
import {
  type Analysis,
  type AnalysisAnnotation,
} from "@/analysis/analysisTypes";
import { type BlockPosition } from "@/blocks/types";
import { isNunjucksExpression, isTemplateExpression } from "@/runtime/mapArgs";
import { isMustacheOnly } from "@/components/fields/fieldUtils";
import { Template } from "nunjucks";
import PipelineExpressionVisitor from "@/blocks/PipelineExpressionVisitor";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { AnnotationType } from "@/types";

const TEMPLATE_ERROR_MESSAGE =
  "Invalid text template. Read more about text templates: https://docs.pixiebrix.com/nunjucks-templates";

type PushAnnotationArgs = {
  position: BlockPosition;
  message: string;
  expression: Expression<unknown>;
};

class TemplateAnalysis extends PipelineExpressionVisitor implements Analysis {
  get id() {
    return "template";
  }

  protected readonly annotations: AnalysisAnnotation[] = [];
  getAnnotations(): AnalysisAnnotation[] {
    return this.annotations;
  }

  run(extension: FormState): void {
    this.visitRootPipeline(extension.extension.blockPipeline, {
      extensionPointType: extension.type,
    });
  }

  private pushErrorAnnotation({
    position,
    message,
    expression,
  }: PushAnnotationArgs) {
    this.annotations.push({
      position,
      message,
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
      this.pushErrorAnnotation({
        position,
        message: TEMPLATE_ERROR_MESSAGE,
        expression,
      });
    } else if (isNunjucksExpression(expression)) {
      try {
        // eslint-disable-next-line no-new
        new Template(expression.__value__, undefined, undefined, true);
      } catch (error) {
        // @ts-expect-error nunjucks error does have message property
        const failureCause = (error.message as string)
          ?.replace("(unknown path)", "")
          .trim();

        const message = `Invalid template: ${failureCause}.`;

        this.pushErrorAnnotation({ position, message, expression });
      }
    }
  }
}

export default TemplateAnalysis;
