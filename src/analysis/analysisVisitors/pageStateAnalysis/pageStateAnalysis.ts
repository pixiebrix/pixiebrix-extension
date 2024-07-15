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
import { AnalysisVisitorWithResolvedBricksABC } from "@/analysis/analysisVisitors/baseAnalysisVisitors";
import { GetPageState, SetPageState } from "@/bricks/effects/pageState";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { AnnotationType } from "@/types/annotationTypes";
import {
  CustomFormRenderer,
  type StateStorage,
  type Storage,
} from "@/bricks/renderers/customForm";

import { StateNamespaces } from "@/platform/state/stateTypes";

const fallbackMessage =
  "This brick is not in a Mod. It will fall back to Public state, which other Mods can read and overwrite.";
const publicMessage =
  "The Public namespace is for advanced use cases. Other Mods are able to read and overwrite Public state.";

/**
 * A visitor that checks for standard uses of page state.
 */
class PageStateVisitor extends AnalysisVisitorWithResolvedBricksABC {
  private isInMod = false;

  get id(): string {
    return "pageState";
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    super.visitBrick(position, blockConfig, extra);

    if (
      blockConfig.id === SetPageState.BRICK_ID ||
      blockConfig.id === GetPageState.BRICK_ID
    ) {
      if (
        blockConfig.config.namespace === StateNamespaces.MOD &&
        !this.isInMod
      ) {
        this.annotations.push({
          position: nestedPosition(position, "config", "namespace"),
          message: fallbackMessage,
          analysisId: this.id,
          type: AnnotationType.Warning,
        });
      } else if (blockConfig.config.namespace === StateNamespaces.PUBLIC) {
        this.annotations.push({
          position: nestedPosition(position, "config", "namespace"),
          message: publicMessage,
          analysisId: this.id,
          type: AnnotationType.Info,
        });
      }
    }

    if (
      blockConfig.id === CustomFormRenderer.BRICK_ID &&
      (blockConfig.config.storage as Storage)?.type === "state"
    ) {
      const storage = blockConfig.config.storage as StateStorage;
      if (storage.namespace === StateNamespaces.MOD && !this.isInMod) {
        this.annotations.push({
          position: nestedPosition(position, "config", "storage", "namespace"),
          message: fallbackMessage,
          analysisId: this.id,
          type: AnnotationType.Warning,
        });
      } else if (storage.namespace === StateNamespaces.PUBLIC) {
        this.annotations.push({
          position: nestedPosition(position, "config", "storage", "namespace"),
          message: publicMessage,
          analysisId: this.id,
          type: AnnotationType.Info,
        });
      }
    }
  }

  override async run(formState: ModComponentFormState): Promise<void> {
    this.isInMod = Boolean(formState.modMetadata);
    await super.run(formState);
  }
}

export default PageStateVisitor;
