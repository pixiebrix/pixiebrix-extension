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

import { type BrickPipeline } from "@/bricks/types";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import { validateRegistryId } from "@/types/helpers";
import { createNewConfiguredBrick } from "@/bricks/exampleBrickConfigs";
import { toExpression } from "@/utils/expressionUtils";

const documentBrickId = validateRegistryId("@pixiebrix/document");
const quickbarActionId = validateRegistryId("@pixiebrix/quickbar/add");

export function getExampleBrickPipeline(type: StarterBrickType): BrickPipeline {
  if (type === "actionPanel") {
    const documentBuilderBrick = createNewConfiguredBrick(documentBrickId);
    return [documentBuilderBrick];
  }

  if (type === "quickBarProvider") {
    const quickbarActionBrick = createNewConfiguredBrick(quickbarActionId);
    quickbarActionBrick.config = {
      title: "Example Action",
      action: toExpression("pipeline", []),
    };
    return [quickbarActionBrick];
  }

  return [];
}
