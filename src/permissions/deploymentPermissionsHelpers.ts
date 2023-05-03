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

// Split from deploymentUtils.ts to avoid circular dependency

import { type Deployment } from "@/types/contract";
import { flatten } from "lodash";
import {
  findLocalDeploymentServiceConfigurations,
  type Locate,
} from "@/utils/deploymentUtils";
import { checkRecipePermissions } from "@/recipes/recipePermissionsHelpers";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";

/**
 * Return permissions required to activate a deployment.
 *
 * Includes permissions for all local configurations that match unbound services. (PixieBrix will error during
 * deployment activation if there is not a unique local configuration matching the unbound service.)
 *
 * @see mergeDeploymentServiceConfigurations
 * @see collectExtensionDefinitionPermissions
 * @see mergePermissionsStatuses
 */
export async function checkDeploymentPermissions(
  deployment: Deployment,
  locate: Locate
): Promise<PermissionsStatus> {
  const blueprint = deployment.package.config;
  const localAuths = await findLocalDeploymentServiceConfigurations(
    deployment,
    locate
  );

  return checkRecipePermissions(
    blueprint,
    flatten(Object.values(localAuths)).map((x) => ({
      id: x.serviceId,
      config: x.id,
    }))
  );
}
