/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import extensionRegistry from "@/extensionPoints/registry";
import { useAsyncEffect } from "use-async-effect";
import { useCallback, useState } from "react";
import { IExtension, IExtensionPoint } from "@/core";
import {
  ExtensionPointDefinition,
  RecipeDefinition,
} from "@/types/definitions";
import { Permissions } from "webextension-polyfill-ts";
import { castArray, compact, groupBy, sortBy, uniq } from "lodash";
import { locator } from "@/background/locator";
import registry, { PIXIEBRIX_SERVICE_ID } from "@/services/registry";
import {
  containsPermissions,
  distinctPermissions,
  mergePermissions,
  requestPermissions,
} from "@/utils/permissions";

const MANDATORY_PERMISSIONS = ["storage", "identity", "tabs", "webNavigation"];

/**
 * Request any permissions the user has not already granted
 * @param permissionsList
 * @returns {Promise<boolean>}
 */
export async function ensureAllPermissions(
  permissionsList: Permissions.Permissions[]
): Promise<boolean> {
  // TODO: Instead of passing around `Array<Permission>`, merge them into a regular `Permission`
  // as early in the code as possible (e.g. in the hook that generates the array).
  // This way we don't need to call `mergePermissions` or loop the array every time.
  return requestPermissions(mergePermissions(permissionsList));
}

export type ServiceAuthPair = {
  id: string;
  config: string;
};

export async function collectPermissions(
  recipe: RecipeDefinition,
  serviceAuths: ServiceAuthPair[]
): Promise<Permissions.Permissions[]>;
export async function collectPermissions(
  extensionPoints: ExtensionPointDefinition[],
  serviceAuths: ServiceAuthPair[]
): Promise<Permissions.Permissions[]>;
export async function collectPermissions(
  recipeOrExtensionPoints: RecipeDefinition | ExtensionPointDefinition[],
  serviceAuths: ServiceAuthPair[]
): Promise<Permissions.Permissions[]> {
  const normalize = (x: Permissions.Permissions) => ({
    origins: castArray(x.origins ?? []),
    // Exclude MANDATORY_PERMISSIONS that were already granted on install. Firefox errors when you request
    // a permission that's in the permissions, but not the optional_permissions
    permissions: castArray(x.permissions ?? []).filter(
      (permission) => !MANDATORY_PERMISSIONS.includes(permission)
    ),
  });

  const extensionPoints = Array.isArray(recipeOrExtensionPoints)
    ? recipeOrExtensionPoints
    : recipeOrExtensionPoints.extensionPoints;

  const servicePermissions = await Promise.all(
    serviceAuths.map(async (serviceAuth) =>
      serviceOriginPermissions(serviceAuth)
    )
  );

  const permissions = await Promise.all(
    extensionPoints.map(
      async ({ id, permissions = {} }: ExtensionPointDefinition) => {
        const extensionPoint = await extensionRegistry.lookup(id);
        return mergePermissions(
          [extensionPoint.permissions, permissions].map((x) => normalize(x))
        );
      }
    )
  );

  return distinctPermissions([...servicePermissions, ...permissions]);
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

/**
 * Return distinct browser permissions required to run the extensions
 * - Extension point
 * - Blocks
 * - Services
 */
export async function extensionPermissions(
  extension: IExtension,
  options?: {
    extensionPoint?: IExtensionPoint;
    includeExtensionPoint?: boolean;
    includeServices?: boolean;
  }
): Promise<Permissions.Permissions[]> {
  const opts = Object.assign(
    {},
    { includeExtensionPoint: true, includeServices: true },
    options
  );
  const extensionPoint =
    opts.extensionPoint ??
    (await extensionRegistry.lookup(extension.extensionPointId));
  const services = await Promise.all(
    extension.services
      .filter((x) => x.config)
      .map(async (x) =>
        serviceOriginPermissions({ id: x.id, config: x.config })
      )
  );
  const blocks = await extensionPoint.getBlocks(extension);
  const blockPermissions = blocks.map((x) => x.permissions);
  return distinctPermissions(
    compact([
      opts.includeExtensionPoint ? extensionPoint.permissions : null,
      ...(opts.includeServices ? services : []),
      ...blockPermissions,
    ])
  );
}

export async function checkPermissions(
  permissionsList: Permissions.Permissions[]
): Promise<boolean> {
  const merged = mergePermissions(permissionsList);
  return containsPermissions(merged);
}

export async function permissionsEnabled(
  extension: IExtension
): Promise<boolean> {
  return checkPermissions(await extensionPermissions(extension));
}

export async function ensureExtensionPermissions(
  extension: IExtension
): Promise<boolean> {
  const permissions = await extensionPermissions(extension);
  return ensureAllPermissions(permissions);
}

/**
 * Return permissions grouped by origin
 */
export function originPermissions(
  permissions: Permissions.Permissions[]
): Permissions.Permissions[] {
  const perms = permissions.flatMap((perm) =>
    perm.origins.map((origin) => ({
      origins: [origin],
      permissions: perm.permissions,
    }))
  );

  const grouped = Object.entries(groupBy(perms, (x) => x.origins[0])).map(
    ([origin, xs]) => ({
      origins: [origin],
      permissions: uniq(xs.flatMap((x) => x.permissions)),
    })
  );

  return sortBy(grouped, (x) => x.origins[0]);
}

export function useExtensionPermissions(
  extension: IExtension
): [boolean | undefined, () => Promise<void>] {
  const [enabled, setEnabled] = useState<boolean | undefined>();

  useAsyncEffect(
    async (isMounted) => {
      try {
        const result = await permissionsEnabled(extension);
        if (!isMounted()) return;
        setEnabled(result);
      } catch {
        // If there's an error checking permissions, just assume they're OK. The use will
        // need to fix the configuration before we can check permissions.
        setEnabled(true);
      }
    },
    [extension]
  );

  const request = useCallback(async () => {
    setEnabled(await ensureExtensionPermissions(extension));
  }, [extension]);

  return [enabled, request];
}
