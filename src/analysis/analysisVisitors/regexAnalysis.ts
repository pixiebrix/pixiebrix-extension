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

import { AnalysisVisitor } from "./baseAnalysisVisitors";
import { AnnotationType } from "@/analysis/analysisTypes";
import { type BlockConfig, type BlockPosition } from "@/blocks/types";
import { type VisitBlockExtra } from "@/blocks/PipelineVisitor";
import { validateRegistryId } from "@/types/helpers";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { getErrorMessage } from "@/errors/errorHelpers";
import { joinPathParts } from "@/utils";

function containsTemplateExpression(literalOrTemplate: string): boolean {
  return literalOrTemplate.includes("{{") || literalOrTemplate.includes("{%");
}

class RegexAnalysis extends AnalysisVisitor {
  get id() {
    return "regex";
  }

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ) {
    super.visitBlock(position, blockConfig, extra);

    if (blockConfig.id !== validateRegistryId("@pixiebrix/regex")) {
      return;
    }

    const { regex: rawRegex = "" } = blockConfig.config;
    let pattern: string;
    if (typeof rawRegex === "string") {
      pattern = rawRegex;
    } else if (
      isTemplateExpression(rawRegex) &&
      rawRegex.__type__ === "nunjucks" &&
      !containsTemplateExpression(rawRegex.__value__)
    ) {
      pattern = rawRegex.__value__;
    } else {
      // Skip variables and dynamic expressions
      return;
    }

    let compileError;

    try {
      // eslint-disable-next-line no-new -- evaluating for type error
      new RegExp(pattern);
    } catch (error) {
      compileError = error;
    }

    // Create new regex on each analysis call to avoid state issues with test
    const namedCapturedGroupRegex = /\(\?<\S+>.*?\)/g;

    if (compileError) {
      this.annotations.push({
        position: {
          path: joinPathParts(position.path, "config", "regex"),
        },
        message: getErrorMessage(compileError),
        analysisId: this.id,
        type: AnnotationType.Error,
      });
    } else if (!namedCapturedGroupRegex.test(pattern)) {
      this.annotations.push({
        position: {
          path: joinPathParts(position.path, "config", "regex"),
        },
        message:
          "Expected regular expression to contain at least one named capture group: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Backreferences",
        analysisId: this.id,
        type: AnnotationType.Warning,
      });
    }
  }
}

export default RegexAnalysis;
