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

import { type StandaloneModDefinition } from "@/types/contract";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";
import { hydrateModComponentInnerDefinitions } from "@/registry/hydrateInnerDefinitions";
import { type HydratedModComponentDefinition } from "@/types/modDefinitionTypes";
import { checkModDefinitionPermissions } from "@/modDefinitions/modDefinitionPermissionsHelpers";

// Separate from modComponentPermissionsHelpers.ts to avoid a circular dependency with modDefinitionPermissionsHelpers.ts

/**
 * Return permissions status for a StandaloneModDefinition and the user's selected dependencies
 * @param extension the StandaloneModDefinition
 * @param integrationDependencies the selected integration configurations
 */
export async function checkCloudExtensionPermissions(
  extension: StandaloneModDefinition,
  integrationDependencies: IntegrationDependency[],
): Promise<PermissionsStatus> {
  const resolved = await hydrateModComponentInnerDefinitions({
    ...extension,
    integrationDependencies,
  });

  const configured = integrationDependencies.filter(({ configId }) => configId);

  const recipeLike = {
    definitions: {},
    extensionPoints: [
      {
        id: resolved.extensionPointId,
        config: resolved.config,
        services: Object.fromEntries(
          integrationDependencies.map(({ outputKey, integrationId }) => [
            outputKey,
            integrationId,
          ]),
        ),
      } as HydratedModComponentDefinition,
    ],
  };

  return checkModDefinitionPermissions(recipeLike, configured);
}
