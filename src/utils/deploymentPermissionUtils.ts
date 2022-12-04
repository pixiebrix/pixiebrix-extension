/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { type Permissions } from "webextension-polyfill";
import { mergePermissions } from "@/utils/permissions";
import { resolveRecipe } from "@/registry/internal";
import { collectPermissions } from "@/permissions";
import { flatten } from "lodash";
import {
  findLocalDeploymentServiceConfigurations,
  type Locate,
} from "@/utils/deploymentUtils";

/**
 * Helper method to collect permissions required for a set of deployments.
 * @see deploymentPermissions
 */
export async function selectDeploymentPermissions(
  deployments: Deployment[],
  locate: Locate
): Promise<Permissions.Permissions> {
  const permissions = await Promise.all(
    deployments.map(async (deployment) =>
      deploymentPermissions(deployment, locate)
    )
  );
  return mergePermissions(permissions);
}

/**
 * Return permissions required to activate a deployment.
 *
 * Includes permissions for all local configurations that match unbound services. (PixieBrix will error during
 * deployment activation if there is not a unique local configuration matching the unbound service.)
 *
 * @see mergeDeploymentServiceConfigurations
 * @see collectPermissions
 */
export async function deploymentPermissions(
  deployment: Deployment,
  locate: Locate
): Promise<Permissions.Permissions> {
  const blueprint = deployment.package.config;
  const resolved = await resolveRecipe(blueprint, blueprint.extensionPoints);
  const localAuths = await findLocalDeploymentServiceConfigurations(
    deployment,
    locate
  );

  return collectPermissions(
    resolved,
    flatten(Object.values(localAuths)).map((x) => ({
      id: x.serviceId,
      config: x.id,
    }))
  );
}
