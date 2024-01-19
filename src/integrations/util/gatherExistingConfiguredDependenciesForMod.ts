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

import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { gatherConfiguredIntegrationDependencies } from "@/store/extensionsUtils";
import getUnconfiguredComponentIntegrations from "@/integrations/util/getUnconfiguredComponentIntegrations";

/**
 * Gather the existing configured dependencies for a given mod definition
 * @param modDefinition the mod definition for which to gather configured dependencies
 * @param modComponents the mod components from which to gather the configured dependencies
 */
function gatherExistingConfiguredDependenciesForMod(
  modDefinition: ModDefinition,
  modComponents: Array<Pick<ModComponentBase, "integrationDependencies">>,
): IntegrationDependency[] {
  const existingConfiguredDependencies =
    gatherConfiguredIntegrationDependencies(modComponents);
  const modIntegrationIds = new Set(
    getUnconfiguredComponentIntegrations(modDefinition).map(
      ({ integrationId }) => integrationId,
    ),
  );
  return existingConfiguredDependencies.filter(({ integrationId }) =>
    modIntegrationIds.has(integrationId),
  );
}

export default gatherExistingConfiguredDependenciesForMod;
