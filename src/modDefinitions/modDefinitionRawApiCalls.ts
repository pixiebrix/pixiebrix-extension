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

import { maybeGetLinkedApiClient } from "@/data/service/apiClient";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import {
  type Deployment,
  type DeploymentModDefinitionPair,
  type PackageConfigDetail,
} from "@/types/contract";
import { allSettled } from "@/utils/promiseUtils";

export async function fetchDeploymentModDefinition({
  package_id: registryId,
  version,
}: Deployment["package"]): Promise<ModDefinition> {
  // TODO: Remove this
  console.log(
    `Fetching deployment package config for ${registryId}@${version}`,
  );

  // TODO: Assert this is always empty and then remove
  // console.log("config", package.config);

  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    throw new Error("No linked API client");
  }

  const { data } = await client.get<PackageConfigDetail>(
    `/api/registry/bricks/${encodeURIComponent(registryId)}/`,
    { params: { version } },
  );

  return {
    ...data.config,
    // Cast to ModDefinition["sharing"] because the fields in ModDefinition["sharing"] are required
    // but optional in PackageConfigDetail["sharing"]
    sharing: data.sharing as ModDefinition["sharing"],
    updated_at: data.updated_at,
  };
}

/**
 * Fetches the mod definitions for the given deployments.
 *
 * Notes:
 * - We can't use RTK query in the background script, which is where this function is used,
 *   so need to fetch the mod definitions manually.
 * - Multiple deployments can theoretically use the same mod version, but that should rarely occur in practice
 *   and handling that won't improve performance significantly, so let's punt on it for now.
 */
export async function fetchDeploymentModDefinitions(deployments: Deployment[]) {
  const { fulfilled } = await allSettled(
    deployments.map(
      async (deployment): Promise<DeploymentModDefinitionPair> => ({
        deployment,
        modDefinition: await fetchDeploymentModDefinition(deployment.package),
      }),
    ),
    { catch: "ignore" },
  );
  return fulfilled;
}
