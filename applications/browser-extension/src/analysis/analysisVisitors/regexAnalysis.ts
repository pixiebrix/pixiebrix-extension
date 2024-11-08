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

import { AnalysisVisitorABC } from "./baseAnalysisVisitors";
import { type BrickConfig, type BrickPosition } from "@/bricks/types";
import { type VisitBlockExtra } from "@/bricks/PipelineVisitor";
import { validateRegistryId } from "../../types/helpers";
import { getErrorMessage } from "@/errors/errorHelpers";
import { AnnotationType } from "../../types/annotationTypes";
import {
  containsTemplateExpression,
  isTemplateExpression,
} from "../../utils/expressionUtils";
import { joinPathParts } from "../../utils/formUtils";

/**
 * Returns the regex literal pattern, or null if the regex is a variable or template expression
 */
export function extractRegexLiteral(blockConfig: BrickConfig): string | null {
  const { regex: rawRegex = "" } = blockConfig.config;
  if (typeof rawRegex === "string") {
    return rawRegex;
  }

  if (
    isTemplateExpression(rawRegex) &&
    rawRegex.__type__ === "nunjucks" &&
    !containsTemplateExpression(rawRegex.__value__)
  ) {
    return rawRegex.__value__;
  }

  // Skip variables and dynamic expressions
  return null;
}

class RegexAnalysis extends AnalysisVisitorABC {
  get id() {
    return "regex";
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ) {
    super.visitBrick(position, blockConfig, extra);

    if (blockConfig.id !== validateRegistryId("@pixiebrix/regex")) {
      return;
    }

    let compileError;

    const pattern = extractRegexLiteral(blockConfig);

    if (!pattern) {
      // Skip variables and dynamic expressions
      return;
    }

    try {
      // eslint-disable-next-line no-new -- evaluating for type error
      new RegExp(pattern);
    } catch (error) {
      compileError = error;
    }

    if (compileError) {
      this.annotations.push({
        position: {
          path: joinPathParts(position.path, "config", "regex"),
        },
        message: getErrorMessage(compileError),
        analysisId: this.id,
        type: AnnotationType.Error,
      });
    }
  }
}

export default RegexAnalysis;
