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

import { type ModComponentBase } from "@/types/modComponentTypes";
import { type Permissions } from "webextension-polyfill";
import { hydrateModComponentInnerDefinitions } from "@/registry/hydrateInnerDefinitions";
import extensionPointRegistry from "@/starterBricks/registry";
import { castArray, compact } from "lodash";
import { mergePermissions } from "@/permissions/permissionsUtils";
import { type StarterBrick } from "@/types/starterBrickTypes";
import { collectIntegrationOriginPermissions } from "@/integrations/util/permissionsHelpers";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";

type PermissionOptions = {
  /**
   * If provided, used instead of the registry version of the referenced extensionPoint.
   */
  extensionPoint?: StarterBrick;

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
 * Returns browser permissions required to run the ModComponentBase
 * - Extension
 * - Blocks
 * - Services (optional, default=true)
 * - Extension point (optional, default=true)
 *
 * @see ModComponentBase.permissions
 * @see StarterBrick.permissions
 * @see checkExtensionPermissions
 */
export async function collectExtensionPermissions(
  extension: ModComponentBase,
  options: PermissionOptions = {},
): Promise<Permissions.Permissions> {
  const { includeExtensionPoint = true, includeServices = true } = options;
  const resolved = await hydrateModComponentInnerDefinitions(extension);

  const extensionPoint =
    options.extensionPoint ??
    (await extensionPointRegistry.lookup(resolved.extensionPointId));

  let servicePermissions: Permissions.Permissions[] = [];

  if (includeServices) {
    servicePermissions = await Promise.all(
      (resolved.integrationDependencies ?? [])
        .filter(({ configId }) => configId)
        .map(async (integrationDependency) =>
          collectIntegrationOriginPermissions(integrationDependency),
        ),
    );
  }

  const blocks = await extensionPoint.getBricks(resolved);
  const blockPermissions = blocks.map((x) => x.permissions);

  return mergePermissions(
    compact([
      extension.permissions ?? {},
      includeExtensionPoint ? extensionPoint.permissions : null,
      ...servicePermissions,
      ...blockPermissions,
    ]),
  );
}

/**
 * Check the status of permissions for one or more ModComponentBases.
 * @param extensionOrExtensions the extension or extensions to check
 */
export async function checkExtensionPermissions(
  extensionOrExtensions: ModComponentBase | ModComponentBase[],
): Promise<PermissionsStatus> {
  const permissions = mergePermissions(
    await Promise.all(
      castArray(extensionOrExtensions).map(async (x) =>
        collectExtensionPermissions(x),
      ),
    ),
  );

  return {
    permissions,
    hasPermissions: await browser.permissions.contains(permissions),
  };
}
