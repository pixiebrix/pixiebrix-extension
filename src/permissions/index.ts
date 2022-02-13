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

import extensionPointRegistry from "@/extensionPoints/registry";
import { IExtension, IExtensionPoint, ServiceAuthPair } from "@/core";
import {
  RecipeDefinition,
  ResolvedExtensionPointConfig,
} from "@/types/definitions";
import { Permissions } from "webextension-polyfill";
import { castArray, compact, uniq } from "lodash";
import { locator } from "@/background/locator";
import registry from "@/services/registry";
import { mergePermissions, requestPermissions } from "@/utils/permissions";
import { Deployment } from "@/types/contract";
import { resolveDefinitions, resolveRecipe } from "@/registry/internal";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

// Copied from the permissions section of manifest.json
const MANDATORY_PERMISSIONS = new Set([
  "activeTab",
  "storage",
  "identity",
  "tabs",
  "webNavigation",
  "contextMenus",
]);

/**
 * Request any permissions the user has not already granted
 * @returns {Promise<boolean>} true iff the the all the permissions already existed, or if the user accepted
 * the new permissions.
 */
export async function ensureAllPermissions(
  permissions: Permissions.Permissions
): Promise<boolean> {
  // `normalize` to ensure the request will succeed on Firefox. See normalize
  return requestPermissions(normalizeOptionalPermissions(permissions));
}

/**
 * Exclude MANDATORY_PERMISSIONS that were already granted on install. Firefox errors when you request a permission
 * that's in the permissions, but not the optional_permissions
 */
function normalizeOptionalPermissions(
  permissions: Permissions.Permissions
): Required<Permissions.Permissions> {
  if (permissions == null) {
    return { origins: [], permissions: [] };
  }

  return {
    origins: uniq(castArray(permissions.origins ?? [])),
    permissions: uniq(
      castArray(permissions.permissions ?? []).filter(
        (permission) => !MANDATORY_PERMISSIONS.has(permission)
      )
    ),
  };
}

/**
 * Convenience method for getting permissions required to activate a deployment.
 * @see blueprintPermissions
 * @see collectPermissions
 */
export async function deploymentPermissions(
  deployment: Deployment
): Promise<Permissions.Permissions> {
  // Don't need to worry about service permissions because for deployments they all go through the API proxy
  return blueprintPermissions(deployment.package.config);
}

/**
 * Convenience method for getting permissions required to activate a blueprint.
 * @see collectPermissions
 */
export async function blueprintPermissions(
  blueprint: RecipeDefinition
): Promise<Permissions.Permissions> {
  const resolved = await resolveRecipe(blueprint, blueprint.extensionPoints);
  return collectPermissions(resolved, []);
}

export async function collectPermissions(
  extensionPoints: ResolvedExtensionPointConfig[],
  serviceAuths: ServiceAuthPair[]
): Promise<Permissions.Permissions> {
  const servicePromises = serviceAuths.map(async (serviceAuth) =>
    serviceOriginPermissions(serviceAuth)
  );

  const extensionPointPromises = extensionPoints.map(
    async ({ id, permissions = {}, config }: ResolvedExtensionPointConfig) => {
      const extensionPoint = await extensionPointRegistry.lookup(id);

      let inner: Permissions.Permissions = {};
      try {
        // XXX: we don't have the types right now to type ExtensionPointConfig. In practice, the config as-is should
        //  provide the structure required by getBlocks. Really, the argument of extensionPermissions should be changed
        //  to not depend on irrelevant information, e.g., the uuid of the extension. This will also involve changing
        //  the type of getBlocks on the ExtensionPoint interface
        inner = await extensionPermissions(
          { config } as unknown as IExtension,
          {
            extensionPoint,
          }
        );
      } catch (error) {
        console.warn("Error getting blocks for extensionPoint %s", id, {
          error,
          config,
        });
      }

      return mergePermissions([extensionPoint.permissions, permissions, inner]);
    }
  );

  const permissionsList = await Promise.all([
    ...servicePromises,
    ...extensionPointPromises,
  ]);

  return mergePermissions(permissionsList);
}

/**
 * Return origin permissions required to use a service with the given configuration.
 */
export async function serviceOriginPermissions(
  dependency: ServiceAuthPair
): Promise<Permissions.Permissions> {
  if (dependency.id === PIXIEBRIX_SERVICE_ID) {
    // Already included in the required permissions for the extension
    return { origins: [] };
  }

  const localConfig = await locator.locate(dependency.id, dependency.config);

  if (localConfig.proxy) {
    // Don't need permissions to access the pixiebrix API proxy server because they're already granted on
    // extension install. The proxy server will check isAvailable when making request
    return { origins: [] };
  }

  const service = await registry.lookup(dependency.id);
  const origins = service.getOrigins(localConfig.config);
  return { origins };
}

type PermissionOptions = {
  /**
   * If provided, used instead of the registry version of the referenced extensionPoint.
   */
  extensionPoint?: IExtensionPoint;

  /**
   * True to include permissions for permissions declared on the extension point and it's default reader.
   */
  includeExtensionPoint?: boolean;

  /**
   * True to include permissions for services referenced by the extension.
   */
  includeServices?: boolean;
};

/**
 * Returns browser permissions required to run the extension
 * - Blocks
 * - Services (optional, default=true)
 * - Extension point (optional, default=true)
 */
export async function extensionPermissions(
  extension: IExtension,
  options: PermissionOptions = {}
): Promise<Permissions.Permissions> {
  const { includeExtensionPoint = true, includeServices = true } = options;
  const resolved = await resolveDefinitions(extension);

  const extensionPoint =
    options.extensionPoint ??
    (await extensionPointRegistry.lookup(resolved.extensionPointId));

  let servicePermissions: Permissions.Permissions[] = [];

  if (includeServices) {
    servicePermissions = await Promise.all(
      (resolved.services ?? [])
        .filter((x) => x.config)
        .map(async (x) =>
          serviceOriginPermissions({ id: x.id, config: x.config })
        )
    );
  }

  const blocks = await extensionPoint.getBlocks(resolved);
  const blockPermissions = blocks.map((x) => x.permissions);

  return mergePermissions(
    compact([
      includeExtensionPoint ? extensionPoint.permissions : null,
      ...servicePermissions,
      ...blockPermissions,
    ])
  );
}
