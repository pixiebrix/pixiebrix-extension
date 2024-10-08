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

import { type ActivatedDeployment, type Deployment } from "@/types/contract";
import { gte, satisfies } from "semver";
import { compact, uniqBy } from "lodash";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import {
  type IntegrationDependency,
  type SanitizedIntegrationConfig,
} from "@/integrations/integrationTypes";
import { validateUUID } from "@/types/helpers";
import { type Except } from "type-fest";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import getUnconfiguredComponentIntegrations from "@/integrations/util/getUnconfiguredComponentIntegrations";
import type { ActivatableDeployment } from "@/types/deploymentTypes";
import { getExtensionVersion } from "@/utils/extensionUtils";
import type { ModInstance } from "@/types/modInstanceTypes";

/**
 * Returns `true` if a managed deployment is active (i.e., has not been remotely paused by an admin)
 * @since 1.4.0
 * @see ModComponentBase._deployment
 */
export function isDeploymentActive(extensionLike: {
  _deployment?: ModComponentBase["_deployment"];
}): boolean {
  return (
    // Check for null/undefined to preserve backward compatability
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
 * @param modInstances the user's currently activated mod instances (including for paused deployments)
 * @param restricted `true` if the user is a restricted organization user (i.e., as opposed to a developer)
 */
export const makeUpdatedFilter =
  (modInstances: ModInstance[], { restricted }: { restricted: boolean }) =>
  (deployment: Deployment) => {
    const deploymentMatch = modInstances.find(
      (x) => x.deploymentMetadata?.id === deployment.id,
    );

    if (restricted) {
      return (
        !deploymentMatch?.deploymentMetadata ||
        !deployment.updated_at ||
        new Date(deploymentMatch.deploymentMetadata.timestamp) <
          new Date(deployment.updated_at)
      );
    }

    // Local copies an unrestricted user (i.e., a developer role) is working on
    const packageMatch = modInstances.find(
      (modInstance) =>
        modInstance.deploymentMetadata == null &&
        modInstance.definition.metadata.id === deployment.package.package_id,
    );

    if (!deploymentMatch && !packageMatch) {
      return true;
    }

    if (
      packageMatch &&
      gte(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- version is present for persisted mods
        packageMatch.definition.metadata.version!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- deployment package is checked above
        deployment.package.version!,
      )
    ) {
      // The unrestricted user already has the blueprint (or a newer version of the blueprint), so don't prompt
      return false;
    }

    if (!deploymentMatch) {
      return true;
    }

    return (
      !deploymentMatch?.deploymentMetadata ||
      !deployment.updated_at ||
      new Date(deploymentMatch.deploymentMetadata?.timestamp) <
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
  activatableDeployments: ActivatableDeployment[] = [],
): boolean {
  // Check that the user's extension can run the deployment

  const extensionVersion = getExtensionVersion();
  const versionRanges = compact(
    activatableDeployments.map(
      ({ modDefinition }) => modDefinition.metadata.extensionVersion,
    ),
  );

  console.debug("Checking deployment version requirements", {
    versionRanges,
    extensionVersion,
  });

  // For now assume the only version restrictions will be that the version must be greater than a certain number
  return versionRanges.some(
    (versionRange) => !satisfies(extensionVersion, versionRange),
  );
}

export function selectActivatedDeployments(
  modInstances: ModInstance[],
): ActivatedDeployment[] {
  return uniqBy(
    modInstances
      .filter((x) => x.deploymentMetadata != null)
      .map((x) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Typescript not picking up filter
        deployment: x.deploymentMetadata!.id,
        blueprint: x.definition.metadata.id,
        blueprintVersion: x.definition.metadata.id,
      })),
    (x) => x.deployment,
  );
}

/**
 * Integration config lookup method. Extracted as parameter to support background messenger calls and calls directly
 * from the background page.
 */
export type FindAllSanitizedConfigsForIntegration = (
  integrationId: RegistryId,
) => Promise<SanitizedIntegrationConfig[]>;

// XXX: this is incorrect for server-based OAuth2 integrations, because they're owned by user but still show as proxy
// because the requests need to be proxied through our server.
const isPersonal = (x: SanitizedIntegrationConfig) => !x.proxy;

/**
 * Return local, configured integration dependencies that are valid to use for the deployment.
 *
 * Excludes the PixieBrix API integration and integrations that are bound in the deployment configuration.
 */
export async function findLocalDeploymentConfiguredIntegrationDependencies(
  { deployment, modDefinition }: ActivatableDeployment,
  locate: FindAllSanitizedConfigsForIntegration,
): Promise<
  Array<
    Except<IntegrationDependency, "configId"> & {
      configs: SanitizedIntegrationConfig[];
    }
  >
> {
  const deploymentIntegrations =
    getUnconfiguredComponentIntegrations(modDefinition);
  // Integrations in the deployment that are bound to a team credential
  const teamBoundIntegrationIds = new Set(
    deployment.bindings?.map((x) => x.auth.service_id) ?? [],
  );
  const unboundIntegrations = deploymentIntegrations.filter(
    ({ integrationId }) =>
      !teamBoundIntegrationIds.has(integrationId) &&
      integrationId !== PIXIEBRIX_INTEGRATION_ID,
  );

  return Promise.all(
    unboundIntegrations.flatMap(async (unconfiguredDependency) => {
      const allConfigs = await locate(unconfiguredDependency.integrationId);
      const personalConfigs = allConfigs.filter((x) => isPersonal(x));
      return {
        ...unconfiguredDependency,
        configs: personalConfigs,
      };
    }),
  );
}

/**
 * Merge deployment service bindings and personal configurations to get all integration dependencies for a deployment.
 */
export async function mergeDeploymentIntegrationDependencies(
  { deployment, modDefinition }: ActivatableDeployment,
  locate: FindAllSanitizedConfigsForIntegration,
): Promise<IntegrationDependency[]> {
  // Note/to-do: There is some logic overlap here with findLocalDeploymentConfiguredIntegrationDependencies() above,
  // but it's tricky to extract right now

  const deploymentIntegrations =
    getUnconfiguredComponentIntegrations(modDefinition);
  const teamBoundIntegrationIds = new Set(
    deployment.bindings?.map((x) => x.auth.service_id) ?? [],
  );

  const pixiebrixIntegration = deploymentIntegrations.find(
    ({ integrationId }) => integrationId === PIXIEBRIX_INTEGRATION_ID,
  );

  const personalIntegrationDependencies: IntegrationDependency[] =
    await Promise.all(
      deploymentIntegrations
        .filter(
          ({ integrationId }) =>
            !teamBoundIntegrationIds.has(integrationId) &&
            integrationId !== PIXIEBRIX_INTEGRATION_ID,
        )
        .map(async (unconfiguredDependency) => {
          const sanitizedConfigs = await locate(
            unconfiguredDependency.integrationId,
          );
          const personalConfigs = sanitizedConfigs.filter((x) => isPersonal(x));
          if (personalConfigs.length > 1) {
            throw new Error(
              `Multiple local configurations found for integration: ${unconfiguredDependency.integrationId}`,
            );
          }

          return {
            ...unconfiguredDependency,
            configId: personalConfigs[0]?.id,
          };
        }),
    );

  const deploymentBindingConfigs = Object.fromEntries(
    deployment.bindings?.map(({ auth, key }) => [auth.service_id, auth.id]) ??
      [],
  );
  const teamIntegrationDependencies: IntegrationDependency[] =
    deploymentIntegrations
      .filter(({ integrationId }) => teamBoundIntegrationIds.has(integrationId))
      .map((unconfiguredDependency) => ({
        ...unconfiguredDependency,
        configId: validateUUID(
          deploymentBindingConfigs[unconfiguredDependency.integrationId],
        ),
      }));

  const integrationDependencies: IntegrationDependency[] = [
    ...personalIntegrationDependencies,
    ...teamIntegrationDependencies,
  ];

  for (const { integrationId, configId } of integrationDependencies) {
    if (configId == null) {
      throw new Error(
        `No configuration found for integration: ${integrationId}`,
      );
    }
  }

  // Placeholder configuration does not have an explicit configuration.
  // Since 1.8.13 - The PixieBrix integration config should use the placeholder id instead of undefined,
  // but we need to keep this integrationDependencies.push() call to after the 'configId == null' check,
  // just in case there are older values flowing through from persistence, etc.
  if (pixiebrixIntegration) {
    integrationDependencies.push(pixiebrixIntegration);
  }

  return integrationDependencies;
}
