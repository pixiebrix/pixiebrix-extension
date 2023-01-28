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

import { AnalysisVisitor } from "./baseAnalysisVisitors";
import { type BlockConfig, type BlockPosition } from "@/blocks/types";
import { type VisitBlockExtra } from "@/blocks/PipelineVisitor";
import { FORM_MODAL_ID } from "@/pageEditor/fields/FormModalOptions";
import { AnnotationType } from "@/types";

class FormBrickAnalysis extends AnalysisVisitor {
  get id() {
    return "form";
  }

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ) {
    super.visitBlock(position, blockConfig, extra);

    // In the future, we'll want to use the isPure property to generalize the rule. However, the isPure property
    // conflates two things: 1) bricks that read state or have implicit state, so may return a different result, and
    // 2) bricks that has UI or other side effects so are not safe to rerun.

    // The other direction (not placing the renderer form in an action, is already handled by brickTypeAnalysis.ts)

    if (
      extra.pipelineFlavor === "noEffect" &&
      blockConfig.id === FORM_MODAL_ID
    ) {
      this.annotations.push({
        position,
        message:
          "The modal form brick shows a temporary form, and therefore can only be used in actions. Instead, use the Custom Form brick.",
        analysisId: this.id,
        type: AnnotationType.Error,
      });
    }
  }
}

export default FormBrickAnalysis;
