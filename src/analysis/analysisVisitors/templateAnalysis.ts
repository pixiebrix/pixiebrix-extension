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

import {
  type Analysis,
  type AnalysisAnnotation,
} from "@/analysis/analysisTypes";
import { type BrickPosition } from "@/bricks/types";
import { isMustacheOnly } from "@/components/fields/fieldUtils";
import PipelineExpressionVisitor from "@/bricks/PipelineExpressionVisitor";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type Expression } from "@/types/runtimeTypes";
import { AnnotationType } from "@/types/annotationTypes";
import {
  isNunjucksExpression,
  isTemplateExpression,
} from "@/utils/expressionUtils";
import { validateNunjucksTemplate } from "@/sandbox/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";

const TEMPLATE_ERROR_MESSAGE =
  "Invalid text template. Read more about text templates: https://docs.pixiebrix.com/developing-mods/developer-concepts/text-template-guide";

type PushAnnotationArgs = {
  position: BrickPosition;
  message: string;
  expression: Expression<unknown>;
};

class TemplateAnalysis extends PipelineExpressionVisitor implements Analysis {
  // XXX: for now we handle asynchronous pipeline traversal by gathering all the promises and awaiting them all
  // see discussion https://github.com/pixiebrix/pixiebrix-extension/pull/4013#discussion_r944690969
  private readonly nunjucksValidationPromises: Array<Promise<void>> = [];

  get id() {
    return "template";
  }

  protected readonly annotations: AnalysisAnnotation[] = [];
  getAnnotations(): AnalysisAnnotation[] {
    return this.annotations;
  }

  async run(formState: ModComponentFormState): Promise<void> {
    this.visitRootPipeline(formState.modComponent.blockPipeline, {
      starterBrickType: formState.type,
    });

    await Promise.all(this.nunjucksValidationPromises);
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
    position: BrickPosition,
    expression: Expression<unknown>,
  ): void {
    if (
      !isTemplateExpression(expression) ||
      expression.__value__.trim() === ""
    ) {
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
      this.nunjucksValidationPromises.push(
        (async () => {
          try {
            await validateNunjucksTemplate(expression.__value__);
          } catch (error) {
            this.pushErrorAnnotation({
              position,
              message: getErrorMessage(error),
              expression,
            });
          }
        })(),
      );
    }
  }
}

export default TemplateAnalysis;
