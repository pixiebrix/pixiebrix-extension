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

import { type Deployment } from "@/types/contract";
import { gte, satisfies } from "semver";
import { compact, uniqBy } from "lodash";
import { PIXIEBRIX_INTEGRATION_ID } from "@/services/constants";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import {
  IntegrationDependency,
  type SanitizedIntegrationConfig,
} from "@/types/integrationTypes";
import { getIntegrationIds } from "@/utils/modDefinitionUtils";
import { validateRegistryId, validateUUID } from "@/types/helpers";

/**
 * Returns `true` if a managed deployment is active (i.e., has not been remotely paused by an admin)
 * @since 1.4.0
 * @see ModComponentBase._deployment
 */
export function isDeploymentActive(extensionLike: {
  _deployment?: ModComponentBase["_deployment"];
}): boolean {
  return (
    // Prior to extension version 1.4.0, there was no `active` field, because there was no ability to pause deployments
    extensionLike._deployment?.active == null ||
    extensionLike._deployment.active
  );
}

/**
 * Returns a predicate that returns `true` if a deployment requires an update.
 *
 * Restricted users:
 * - The remote deployment's extension updated_at timestamp is after the installed version. The updated_at timestamp
 *   can change even if the blueprint version doesn't change because of 1) the deployment was paused, or 2) the
 *   admin changed a binding on the deployment
 *
 * Unrestricted users:
 * - Same as above, but ignore deployments where the user has a newer version of the blueprint installed because that
 *   means they are doing local deployment on the blueprint.
 *
 * @param installed the user's currently installed extensions (including for paused deployments)
 * @param restricted `true` if the user is a restricted organization user (i.e., as opposed to a developer)
 */
export const makeUpdatedFilter =
  (installed: ModComponentBase[], { restricted }: { restricted: boolean }) =>
  (deployment: Deployment) => {
    const deploymentMatch = installed.find(
      (extension) => extension._deployment?.id === deployment.id
    );

    if (restricted) {
      return (
        !deploymentMatch ||
        new Date(deploymentMatch._deployment.timestamp) <
          new Date(deployment.updated_at)
      );
    }

    // Local copies an unrestricted user (i.e., a developer role) is working on
    const blueprintMatch = installed.find(
      (extension) =>
        extension._deployment == null &&
        extension._recipe?.id === deployment.package.package_id
    );

    if (!deploymentMatch && !blueprintMatch) {
      return true;
    }

    if (
      blueprintMatch &&
      gte(blueprintMatch._recipe.version, deployment.package.version)
    ) {
      // The unrestricted user already has the blueprint (or a newer version of the blueprint), so don't prompt
      return false;
    }

    if (!deploymentMatch) {
      return true;
    }

    return (
      new Date(deploymentMatch._deployment.timestamp) <
      new Date(deployment.updated_at)
    );
  };

/**
 * Returns `true` if the user needs to update their browser extension to install the deployments.
 *
 * For now assumes only minimum version requirements. (I.e., this method also returns true if there's a maximum version
 * violation).
 */
export function checkExtensionUpdateRequired(
  deployments: Deployment[]
): boolean {
  // Check that the user's extension van run the deployment
  const { version: extensionVersion } = browser.runtime.getManifest();
  const versionRanges = compact(
    deployments.map((x) => x.package.config.metadata.extensionVersion)
  );

  console.debug("Checking deployment version requirements", {
    versionRanges,
    extensionVersion,
  });

  // For now assume the only version restrictions will be that the version must be greater than a certain number
  return versionRanges.some(
    (versionRange) => !satisfies(extensionVersion, versionRange)
  );
}

/**
 * Deployment installed on the client. A deployment may be installed but not active (see DeploymentContext.active)
 */
type InstalledDeployment = {
  deployment: UUID;
  blueprint: RegistryId;
  blueprintVersion: string;
};

export function selectInstalledDeployments(
  extensions: Array<Pick<ModComponentBase, "_deployment" | "_recipe">>
): InstalledDeployment[] {
  return uniqBy(
    extensions
      .filter((x) => x._deployment?.id != null)
      .map((x) => ({
        deployment: x._deployment.id,
        blueprint: x._recipe?.id,
        blueprintVersion: x._recipe?.version,
      })),
    (x) => x.deployment
  );
}

/**
 * Integration config lookup method. Extracted as parameter to support background messenger calls and calls directly
 * from the background page.
 */
export type Locate = (
  integrationId: RegistryId
) => Promise<SanitizedIntegrationConfig[]>;

/**
 * Return local integration configurations that are valid to use for the deployment.
 *
 * Excludes the PixieBrix API integration and integrations that are bound in the deployment configuration.
 */
export async function findLocalDeploymentIntegrationConfigs(
  deployment: Deployment,
  locate: Locate
): Promise<Record<RegistryId, SanitizedIntegrationConfig[]>> {
  const deploymentIntegrationIds = getIntegrationIds(deployment.package.config);
  // Integrations in the deployment that are bound to a team credential
  const teamBoundIntegrationIds = new Set(
    deployment.bindings.map((x) => x.auth.service_id)
  );
  const unboundIntegrationIds = deploymentIntegrationIds.filter(
    (integrationId) =>
      !teamBoundIntegrationIds.has(integrationId) &&
      integrationId !== PIXIEBRIX_INTEGRATION_ID
  );

  // XXX: this is incorrect for server-based OAuth2 integrations, because they're owned by user but still show as proxy
  // because the requests need to be proxied through our server.
  const isPersonal = (x: SanitizedIntegrationConfig) => !x.proxy;

  return Object.fromEntries(
    await Promise.all(
      unboundIntegrationIds.map(async (integrationId: RegistryId) => {
        const all = await locate(integrationId);
        return [integrationId, all.filter((x) => isPersonal(x))];
      })
    )
  );
}

export async function mergeDeploymentIntegrationDependencies(
  deployment: Deployment,
  locate: Locate
): Promise<IntegrationDependency[]> {
  // Merge deployment service bindings and personal configurations
  const personalConfigs = await findLocalDeploymentIntegrationConfigs(
    deployment,
    locate
  );
  const integrationDependencies: IntegrationDependency[] = [
    ...Object.entries(personalConfigs).map(
      ([id, configs]: [
        id: RegistryId,
        configs: SanitizedIntegrationConfig[]
      ]) => {
        if (configs.length > 1) {
          throw new Error(
            `Multiple local configurations found for integration: ${id}`
          );
        }

        return {
          id,
          config: configs[0]?.id,
        };
      }
    ),
    ...deployment.bindings.map(({ auth }) => ({
      id: validateRegistryId(auth.service_id),
      config: validateUUID(auth.id),
    })),
  ];

  for (const { id, config } of integrationDependencies) {
    if (config == null) {
      throw new Error(`No configuration found for integration: ${id}`);
    }
  }

  return integrationDependencies;
}
