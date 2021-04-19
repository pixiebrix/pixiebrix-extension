/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import extensionRegistry from "@/extensionPoints/registry";
import { distinctPermissions, mergePermissions } from "@/blocks/available";
import { useAsyncEffect } from "use-async-effect";
import { useState, useCallback } from "react";
import { IExtension } from "@/core";
import {
  ExtensionPointDefinition,
  RecipeDefinition,
} from "@/types/definitions";
import { Permissions, browser } from "webextension-polyfill-ts";
import { sortBy, castArray, groupBy, uniq, every } from "lodash";
import { locator } from "@/background/locator";
import registry from "@/services/registry";

const MANDATORY_PERMISSIONS = ["storage", "identity", "tabs", "webNavigation"];

/**
 * Request any permissions the user has not already granted
 * @param permissionsList
 * @returns {Promise<boolean>}
 */
export async function ensureAllPermissions(
  permissionsList: Permissions.Permissions[]
): Promise<boolean> {
  return await browser.permissions.request(mergePermissions(permissionsList));
  // On FF can't check if we already have the permission because promise chains break it's detection of
  // whether or not we're in a user-triggered event. That also prevents making multiple permissions requests
  // for a single button click
  // https://stackoverflow.com/a/47729896/402560
  // for (const permissions of permissionsList) {
  //   if (!(await browser.permissions.contains(permissions))) {
  //     const granted = await browser.permissions.request(permissions);
  //     if (!granted) {
  //       return false;
  //     }
  //   }
  // }
  // return true;
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
    serviceAuths.map(serviceOriginPermissions)
  );

  const permissions = await Promise.all(
    extensionPoints.map(
      async ({ id, permissions = {} }: ExtensionPointDefinition) => {
        // console.debug(`Extra permissions for ${id}`, permissions);
        const extensionPoint = await extensionRegistry.lookup(id);
        return mergePermissions(
          [extensionPoint.permissions, permissions].map(normalize)
        );
      }
    )
  );

  return distinctPermissions([...servicePermissions, ...permissions]);
}

export async function serviceOriginPermissions(
  dependency: ServiceAuthPair
): Promise<Permissions.Permissions> {
  const localConfig = await locator.locate(dependency.id, dependency.config);

  if (localConfig.proxy) {
    // Don't need permissions to access the pixiebrix api server because they're already granted on
    // extension install
    return { origins: [] };
  } else {
    const service = await registry.lookup(dependency.id);
    const matchPatterns = service.getOrigins(localConfig.config);
    return { origins: matchPatterns };
  }
}

/**
 * Return distinct browser permissions required to run the extensions
 * - Extension point
 * - Blocks
 * - Services
 */
export async function extensionPermissions(
  extension: IExtension
): Promise<Permissions.Permissions[]> {
  const { extensionPointId } = extension;
  const extensionPoint = await extensionRegistry.lookup(extensionPointId);
  const services = await Promise.all(
    extension.services
      .filter((x) => x.config)
      .map((x) => serviceOriginPermissions({ id: x.id, config: x.config }))
  );
  const blocks = await extensionPoint.getBlocks(extension);
  const blockPermissions = blocks.map((x) => x.permissions);
  return distinctPermissions([
    extensionPoint.permissions,
    ...services,
    ...blockPermissions,
  ]);
}

export async function checkPermissions(
  permissionsList: Permissions.Permissions[]
): Promise<boolean> {
  return every(
    await Promise.all(
      permissionsList.map((permissions) =>
        browser.permissions.contains(permissions)
      )
    )
  );
}

export async function permissionsEnabled(
  extension: IExtension
): Promise<boolean> {
  return await checkPermissions(await extensionPermissions(extension));
}

export async function ensureExtensionPermissions(
  extension: IExtension
): Promise<boolean> {
  const permissions = await extensionPermissions(extension);
  return await ensureAllPermissions(permissions);
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
  const [enabled, setEnabled] = useState(undefined);

  useAsyncEffect(
    async (isMounted) => {
      try {
        const result = await permissionsEnabled(extension);
        if (!isMounted()) return;
        setEnabled(result);
      } catch (ex) {
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
