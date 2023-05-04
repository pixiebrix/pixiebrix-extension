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

import { type CloudExtension } from "@/types/contract";
import { type ServiceDependency } from "@/types/serviceTypes";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";
import { resolveDefinitions } from "@/registry/internal";
import { type ResolvedExtensionDefinition } from "@/types/recipeTypes";
import { checkRecipePermissions } from "@/recipes/recipePermissionsHelpers";

// Separate from extensionPermissionsHelpers.ts to avoid a circular dependency with recipePermissionsHelpers.ts

/**
 * Return permissions status for a CloudExtension and the user's selected dependencies
 * @param extension the CloudExtension
 * @param services the selected integration configurations
 */
export async function checkCloudExtensionPermissions(
  extension: CloudExtension,
  services: ServiceDependency[]
): Promise<PermissionsStatus> {
  const resolved = await resolveDefinitions({ ...extension, services });

  const configured = services.filter((x) => x.config);

  const recipeLike = {
    definitions: {},
    extensionPoints: [
      {
        id: resolved.extensionPointId,
        config: resolved.config,
        services: Object.fromEntries(
          services.map((service) => [service.outputKey, service.id])
        ),
      } as ResolvedExtensionDefinition,
    ],
  };

  return checkRecipePermissions(
    recipeLike,
    configured.map(({ id, config }) => ({ id, config }))
  );
}
