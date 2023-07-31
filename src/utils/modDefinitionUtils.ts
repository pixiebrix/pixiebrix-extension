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

import { type RegistryId } from "@/types/registryTypes";
import {
  type ModComponentDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import { compact, uniq } from "lodash";
import { PIXIEBRIX_INTEGRATION_ID } from "@/services/constants";
import type {
  StarterBrickDefinition,
  StarterBrickType,
} from "@/starterBricks/types";
import starterBrickRegistry from "@/starterBricks/registry";
import { resolveRecipeInnerDefinitions } from "@/registry/internal";
import { QuickBarStarterBrickABC } from "@/starterBricks/quickBarExtension";
import { QuickBarProviderStarterBrickABC } from "@/starterBricks/quickBarProviderExtension";

/**
 * Return an array of unique integration ids that are required to be configured
 * in order to install this mod, excluding the PixieBrix integration.
 * @param modDefinition the mod from which to extract integration ids
 */
export const getRequiredIntegrationIds = (
  modDefinition: ModDefinition
): RegistryId[] =>
  uniq(
    (modDefinition.extensionPoints ?? [])
      .flatMap((extensionPoint) => Object.values(extensionPoint.services ?? {}))
      // The PixieBrix service gets automatically configured, so no need to include it
      .filter((serviceId) => serviceId !== PIXIEBRIX_INTEGRATION_ID)
  );

const getStarterBrickType = async (
  modComponentDefinition: ModComponentDefinition,
  modDefinition: ModDefinition
): Promise<StarterBrickType | null> => {
  // Look up the extension point in recipe inner definitions first
  if (modDefinition.definitions?.[modComponentDefinition.id]) {
    const definition: StarterBrickDefinition = modDefinition.definitions[
      modComponentDefinition.id
    ].definition as StarterBrickDefinition;
    const extensionPointType = definition?.type;

    if (extensionPointType) {
      return extensionPointType;
    }
  }

  // If no inner definitions, look up the extension point in the registry
  const extensionPointFromRegistry = await starterBrickRegistry.lookup(
    modComponentDefinition.id as RegistryId
  );

  return (extensionPointFromRegistry?.kind as StarterBrickType) ?? null;
};

export const getContainedStarterBrickTypes = async (
  modDefinition: ModDefinition
): Promise<StarterBrickType[]> => {
  const extensionPointTypes = await Promise.all(
    modDefinition.extensionPoints.map(async (extensionPoint) =>
      getStarterBrickType(extensionPoint, modDefinition)
    )
  );

  return uniq(compact(extensionPointTypes));
};

/**
 * Returns true if the recipe includes a static or dynamic Quick Bar entries.
 * @param modDefinition the mod definition
 */
export async function includesQuickBarStarterBrick(
  modDefinition?: ModDefinition
): Promise<boolean> {
  const resolvedExtensionDefinitions = await resolveRecipeInnerDefinitions(
    modDefinition
  );

  for (const { id } of resolvedExtensionDefinitions) {
    // eslint-disable-next-line no-await-in-loop -- can break when we find one
    const starterBrick = await starterBrickRegistry.lookup(id);
    if (
      QuickBarStarterBrickABC.isQuickBarExtensionPoint(starterBrick) ||
      QuickBarProviderStarterBrickABC.isQuickBarProviderExtensionPoint(
        starterBrick
      )
    ) {
      return true;
    }
  }

  return false;
}
