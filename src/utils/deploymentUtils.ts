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

import {
  DeploymentContext,
  IExtension,
  RegistryId,
  SanitizedServiceConfiguration,
  UUID,
} from "@/core";
import { Deployment } from "@/types/contract";
import { gte, satisfies } from "semver";
import { compact, sortBy, uniq, uniqBy } from "lodash";
import { RecipeDefinition } from "@/types/definitions";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

/**
 * Returns `true` if a managed deployment is active (i.e., has not been remotely paused by an admin)
 * @since 1.4.0
 * @see IExtension._deployment
 */
export function isDeploymentActive(extensionLike: {
  _deployment?: DeploymentContext;
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
  (installed: IExtension[], { restricted }: { restricted: boolean }) =>
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
 * Return service registry ids used by the blueprint.
 */
export function extractRecipeServiceIds(
  recipe: RecipeDefinition
): RegistryId[] {
  return sortBy(
    uniq(recipe.extensionPoints.flatMap((x) => Object.values(x.services ?? {})))
  );
}

/**
 * Deployment installed on the client. A deployment may be installed but not active (see DeploymentContext.active)
 */
export type InstalledDeployment = {
  deployment: UUID;
  blueprint: RegistryId;
  blueprintVersion: string;
};

export function selectInstalledDeployments(
  extensions: Array<Pick<IExtension, "_deployment" | "_recipe">>
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
 * Service configuration lookup method. Extracted as parameter to support background messenger calls and calls directly
 * from the background page.
 */
type Locate = (
  serviceId: RegistryId
) => Promise<SanitizedServiceConfiguration[]>;

/**
 * Return local service configurations that are valid to use for the deployment.
 */
export async function findPersonalServiceConfigurations(
  deployment: Deployment,
  locate: Locate
): Promise<Record<RegistryId, SanitizedServiceConfiguration[]>> {
  const deploymentServices = extractRecipeServiceIds(deployment.package.config);
  // Services in the deployment that are bound to a team credential
  const boundServices = new Set(
    deployment.bindings.map((x) => x.auth.service_id)
  );
  const unboundServices = deploymentServices.filter(
    (serviceId) =>
      !boundServices.has(serviceId) && serviceId !== PIXIEBRIX_SERVICE_ID
  );

  // XXX: this is incorrect for server-based OAuth2 integrations, because they're owned by user but still show as proxy
  // because the requests need to be proxied through our server.
  const isPersonal = (x: SanitizedServiceConfiguration) => !x.proxy;

  const servicePromises = await Promise.all(
    unboundServices.map(async (serviceId: RegistryId) => {
      const all = await locate(serviceId);
      return [serviceId, all.filter((x) => isPersonal(x))];
    })
  );

  return Object.fromEntries(servicePromises);
}

export async function mergeDeploymentServiceConfigurations(
  deployment: Deployment,
  locate: Locate
): Promise<Record<RegistryId, UUID>> {
  // Merge deployment service bindings and personal configurations
  const personalConfigurations = await findPersonalServiceConfigurations(
    deployment,
    locate
  );
  const serviceEntries = [
    ...Object.entries(personalConfigurations).map(([serviceId, configs]) => {
      if (configs.length > 1) {
        throw new Error(
          `Multiple local configurations found for integration: ${serviceId}`
        );
      }

      return [serviceId, configs[0]?.id];
    }),
    ...deployment.bindings.map(({ auth }) => [auth.service_id, auth.id]),
  ];

  for (const [serviceId, authId] of serviceEntries) {
    if (authId == null) {
      throw new Error(`No configuration found for integration: ${serviceId}`);
    }
  }

  return Object.fromEntries(serviceEntries);
}
