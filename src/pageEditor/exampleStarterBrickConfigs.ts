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
import { type StarterBrickKind } from "@/types/starterBrickTypes";
import { validateRegistryId } from "@/types/helpers";
import {
  createNewConfiguredBrick,
  getExampleBrickConfig,
} from "@/pageEditor/exampleBrickConfigs";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { toExpression } from "@/utils/expressionUtils";

const documentBrickId = validateRegistryId("@pixiebrix/document");
const quickbarActionId = validateRegistryId("@pixiebrix/quickbar/add");
const tourStepBrickId = validateRegistryId("@pixiebrix/tour/step");

export function getExampleBrickPipeline(type: StarterBrickKind): BrickPipeline {
  if (type === "actionPanel") {
    const documentBuilderBlock = createNewConfiguredBrick(documentBrickId);
    return [documentBuilderBlock];
  }

  if (type === "quickBarProvider") {
    const quickbarActionBlock = createNewConfiguredBrick(quickbarActionId);
    quickbarActionBlock.config = {
      title: "Example Action",
      action: toExpression("pipeline", []),
    };
    return [quickbarActionBlock];
  }

  if (type === "tour") {
    const tourStepBlock = createNewConfiguredBrick(tourStepBrickId);
    tourStepBlock.outputKey = validateOutputKey("step");
    tourStepBlock.config = getExampleBrickConfig(tourStepBrickId);

    return [tourStepBlock];
  }

  return [];
}
