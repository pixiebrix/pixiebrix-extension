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

import { nestedPosition, type VisitBlockExtra } from "../../../bricks/PipelineVisitor";
import { type BrickConfig, type BrickPosition } from "../../../bricks/types";
import { AnalysisVisitorWithResolvedBricksABC } from "../baseAnalysisVisitors";
import { GetPageState, SetPageState } from "../../../bricks/effects/pageState";
import { AnnotationType } from "../../../types/annotationTypes";
import {
  CustomFormRenderer,
  type StateStorage,
  type Storage,
} from "../../../bricks/renderers/customForm";

import { StateNamespaces } from "../../../platform/state/stateTypes";

const publicMessage =
  "The Public namespace is for advanced use cases. Other Mods are able to read and overwrite Public state.";

/**
 * A visitor that checks for standard uses of page state.
 */
class PageStateVisitor extends AnalysisVisitorWithResolvedBricksABC {
  get id(): string {
    return "pageState";
  }

  override visitBrick(
    position: BrickPosition,
    brickConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    super.visitBrick(position, brickConfig, extra);

    if (
      [SetPageState.BRICK_ID, GetPageState.BRICK_ID].includes(brickConfig.id) &&
      brickConfig.config.namespace === StateNamespaces.PUBLIC
    ) {
      this.annotations.push({
        position: nestedPosition(position, "config", "namespace"),
        message: publicMessage,
        analysisId: this.id,
        type: AnnotationType.Info,
      });
    }

    if (
      brickConfig.id === CustomFormRenderer.BRICK_ID &&
      (brickConfig.config.storage as Storage)?.type === "state"
    ) {
      const storage = brickConfig.config.storage as StateStorage;
      if (storage.namespace === StateNamespaces.PUBLIC) {
        this.annotations.push({
          position: nestedPosition(position, "config", "storage", "namespace"),
          message: publicMessage,
          analysisId: this.id,
          type: AnnotationType.Info,
        });
      }
    }
  }
}

export default PageStateVisitor;
