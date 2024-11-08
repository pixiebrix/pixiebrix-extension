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

import { getLinkedApiClient } from "@/data/service/apiClient";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type Deployment, type PackageConfigDetail } from "@/types/contract";
import { allSettled } from "../utils/promiseUtils";
import type { ActivatableDeployment } from "@/types/deploymentTypes";
import { API_PATHS } from "@/data/service/urlPaths";

/**
 * Fetches the mod definition for the given deployment.
 *
 * Potential performance improvements:
 *
 * 1. Check to see if the mod definition version in IDB matches the requested version. However, there's a small
 *    chance using the local copy would give the incorrect definition in the following sequence:
 *
 *    - Save mod as 1.0.0
 *    - End-user fetches mod
 *    - Save mod as 1.0.0 (incrementing version isn't required because it's not deployed yet)
 *    - Deploy mod as 1.0.0
 *    - End-user fetches deployments and sees the stale mod content
 *
 *    That risk might be with the performance benefits, though.
 *
 *    We could potentially leverage the updated_at timestamp and version, but the IDB registry uses the time
 *    it fetched, not the updated_at timestamp on the package:
 *    @see syncPackages
 *
 * 2. Multiple deployments can theoretically use the same mod version, so we can check if the mod version was already
 *    fetched. But that should rarely occur in practice and handling that won't improve performance significantly.
 */
async function fetchDeploymentModDefinition({
  package_id: registryId,
  version,
}: Deployment["package"]): Promise<ModDefinition> {
  const client = await getLinkedApiClient();
  const { data } = await client.get<PackageConfigDetail>(
    API_PATHS.REGISTRY_BRICK(registryId),
    { params: { version } },
  );

  return {
    ...data.config,
    // XXX: cast to ModDefinition["sharing"] because the fields in ModDefinition["sharing"] are required
    // but currently marked as optional in PackageConfigDetail["sharing"]. Drop after API transformer work.
    sharing: data.sharing as ModDefinition["sharing"],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- PackageConfigDetail.updated_at is always returned
    updated_at: data.updated_at!,
  };
}

/**
 * Fetches the mod definitions for the given deployments. Excludes any deployments that fail to fetch.
 *
 * Notes:
 * - We can't use RTK query in the background script, which is where this function is used,
 *   so need to fetch the mod definitions manually.
 * - Multiple deployments can theoretically use the same mod version, but that should rarely occur in practice
 *   and handling that won't improve performance significantly, so let's punt on it for now.
 */
export async function fetchDeploymentModDefinitions(
  deployments: Deployment[],
): Promise<ActivatableDeployment[]> {
  const { fulfilled } = await allSettled(
    deployments.map(async (deployment) => ({
      deployment,
      modDefinition: await fetchDeploymentModDefinition(deployment.package),
    })),
    { catch: "ignore" },
  );
  return fulfilled;
}
