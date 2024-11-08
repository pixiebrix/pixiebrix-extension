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
  type ModComponentDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import { type StarterBrickDefinitionProp } from "./types";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import starterBrickRegistry from "./registry";
import { hydrateModInnerDefinitions } from "../registry/hydrateInnerDefinitions";
import { QuickBarStarterBrickABC } from "./quickBar/quickBarStarterBrick";
import { DynamicQuickBarStarterBrickABC } from "./dynamicQuickBar/dynamicQuickBarStarterBrick";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type UUID } from "@/types/stringTypes";

export function getAllModComponentDefinitionsWithType(
  modDefinition: ModDefinition,
  type: StarterBrickType,
): ModComponentDefinition[] {
  return modDefinition.extensionPoints.filter((extensionPoint) => {
    const definition: StarterBrickDefinitionProp = modDefinition.definitions?.[
      extensionPoint.id
    ]?.definition as StarterBrickDefinitionProp;
    return definition?.type === type;
  });
}

/**
 * Returns true if the recipe includes a static or dynamic Quick Bar entries.
 */
export async function includesQuickBarStarterBrick(
  modDefinition?: ModDefinition,
): Promise<boolean> {
  const resolvedInnerDefinitions =
    (await hydrateModInnerDefinitions(modDefinition)) ?? [];

  for (const { id } of resolvedInnerDefinitions) {
    // eslint-disable-next-line no-await-in-loop -- can break when we find one
    const starterBrick = await starterBrickRegistry.lookup(id);
    if (
      QuickBarStarterBrickABC.isQuickBarStarterBrick(starterBrick) ||
      DynamicQuickBarStarterBrickABC.isDynamicQuickBarStarterBrick(starterBrick)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Find the activated mod components for a subset of Mod Component Definitions
 * and return their ids.
 */
export function getModComponentIdsForModComponentDefinitions(
  activatedModComponents: ActivatedModComponent[],
  modComponentDefinitions: ModComponentDefinition[],
): UUID[] {
  return modComponentDefinitions
    .map((modComponentDefinition) => {
      const activatedModComponent = activatedModComponents.find(
        (activatedModComponent) =>
          activatedModComponent.extensionPointId === modComponentDefinition.id,
      );
      return activatedModComponent?.id;
    })
    .filter(Boolean);
}
