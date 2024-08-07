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

import { AnalysisVisitorWithResolvedBricksABC } from "@/analysis/analysisVisitors/baseAnalysisVisitors";
import {
  ModComponentFormState,
  SidebarFormState,
} from "@/pageEditor/starterBricks/formStateTypes";
import { AnnotationType } from "@/types/annotationTypes";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

class SidebarStarterBrickAnalysis extends AnalysisVisitorWithResolvedBricksABC {
  override id = "sidebarStarterBrick";

  override visitStarterBrick(
    starterBrick: ModComponentFormState["starterBrick"],
  ): void {
    if (starterBrick.definition.type === StarterBrickTypes.SIDEBAR_PANEL) {
      const starterBrickFormState = this.formState as SidebarFormState;
      // Ideally we could just use the brick inputSchema to perform the required field validation more generally across all bricks, but this is difficult because
      // 1. The inputSchema is not easily referenced (we would need to fetch the starter brick package from the registry to reference the schema, or modify the formState to include the schema)
      // 2. the inputSchema does not align exactly with the actual form state. For example, the sidebar schema requires
      //   a `body` field, but the form state excludes this field. See:
      // (https://github.com/pixiebrix/pixiebrix-extension/blob/fc58da4c50083c723050c3653935197834f28382/src/starterBricks/sidebar/sidebarStarterBrick.ts#L105)
      // (https://github.com/pixiebrix/pixiebrix-extension/blob/c633539ead2e5c9d4ec7610c1e16c12a04e4a0a2/src/pageEditor/starterBricks/formStateTypes.ts#L97)
      if (
        starterBrickFormState.modComponent.heading == null ||
        starterBrickFormState.modComponent.heading === ""
      ) {
        this.annotations.push({
          position: { path: "modComponent.heading" },
          message: "Tab Title is required",
          analysisId: this.id,
          type: AnnotationType.Warning,
        });
      }
    }
  }
}

export default SidebarStarterBrickAnalysis;
