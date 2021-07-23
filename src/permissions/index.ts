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

import extensionPointRegistry from "@/extensionPoints/registry";
import { useAsyncEffect } from "use-async-effect";
import { useCallback, useState } from "react";
import { IExtension, IExtensionPoint, ServiceAuthPair } from "@/core";
import { ExtensionPointConfig, RecipeDefinition } from "@/types/definitions";
import { Permissions } from "webextension-polyfill-ts";
import { castArray, compact, groupBy, sortBy, uniq, flatten } from "lodash";
import { locator } from "@/background/locator";
import registry, { PIXIEBRIX_SERVICE_ID } from "@/services/registry";
import {
  containsPermissions,
  distinctPermissions,
  mergePermissions,
  requestPermissions,
} from "@/utils/permissions";

const MANDATORY_PERMISSIONS = new Set([
  "storage",
  "identity",
  "tabs",
  "webNavigation",
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
  return {
    origins: uniq(castArray(permissions.origins ?? [])),
    permissions: uniq(
      castArray(permissions.permissions ?? []).filter(
        (permission) => !MANDATORY_PERMISSIONS.has(permission)
      )
    ),
  };
}

export async function blueprintPermissions(
  blueprint: RecipeDefinition
): Promise<Permissions.Permissions> {
  const permissions = await Promise.all(
    blueprint.extensionPoints.map(
      async ({ id, permissions = {} }: ExtensionPointConfig) => {
        const extensionPoint = await extensionPointRegistry.lookup(id);

        // TODO: check extension permissions
        return [extensionPoint.permissions, permissions];
      }
    )
  );

  return mergePermissions(flatten(permissions));
}

export async function collectPermissions(
  extensionPoints: ExtensionPointConfig[],
  serviceAuths: ServiceAuthPair[]
): Promise<Permissions.Permissions[]> {
  const servicePermissions = await Promise.all(
    serviceAuths.map(async (serviceAuth) =>
      serviceOriginPermissions(serviceAuth)
    )
  );

  const permissions = await Promise.all(
    extensionPoints.map(
      async ({ id, permissions = {} }: ExtensionPointConfig) => {
        const extensionPoint = await extensionPointRegistry.lookup(id);
        return mergePermissions([extensionPoint.permissions, permissions]);
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
 * - Extension point
 * - Blocks
 * - Services
 */
export async function extensionPermissions(
  extension: IExtension,
  options: PermissionOptions = {}
): Promise<Permissions.Permissions> {
  const opts = {
    includeExtensionPoint: true,
    includeServices: true,
    ...options,
  };
  const extensionPoint =
    opts.extensionPoint ??
    (await extensionPointRegistry.lookup(extension.extensionPointId));
  const services = await Promise.all(
    extension.services
      .filter((x) => x.config)
      .map(async (x) =>
        serviceOriginPermissions({ id: x.id, config: x.config })
      )
  );
  const blocks = await extensionPoint.getBlocks(extension);
  const blockPermissions = blocks.map((x) => x.permissions);
  return mergePermissions(
    distinctPermissions(
      compact([
        opts.includeExtensionPoint ? extensionPoint.permissions : null,
        ...(opts.includeServices ? services : []),
        ...blockPermissions,
      ])
    )
  );
}

export async function permissionsEnabled(
  extension: IExtension
): Promise<boolean> {
  const permissions = await extensionPermissions(extension);
  return containsPermissions(permissions);
}

export async function ensureExtensionPermissions(
  extension: IExtension
): Promise<boolean> {
  const permissions = await extensionPermissions(extension);
  return ensureAllPermissions(permissions);
}

/**
 * Return permissions grouped by origin.
 * @deprecated The logic of grouping permissions by origin doesn't actually make sense as we don't currently have any
 * way to enforce permissions on a per-origin basis. https://github.com/pixiebrix/pixiebrix-extension/pull/828#discussion_r671703130
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
