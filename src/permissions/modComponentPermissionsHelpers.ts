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
import starterBrickRegistry from "@/starterBricks/registry";
import { castArray, compact } from "lodash";
import { mergePermissions } from "@/permissions/permissionsUtils";
import { type StarterBrick } from "@/types/starterBrickTypes";
import { collectIntegrationOriginPermissions } from "@/integrations/util/permissionsHelpers";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";

type PermissionOptions = {
  /**
   * If provided, used instead of the registry version of the referenced starter brick.
   */
  starterBrick?: StarterBrick;

  /**
   * True to include permissions for permissions declared on the starter brick and it's default reader.
   */
  includeStarterBrick?: boolean;

  /**
   * True to include permissions for integrations referenced by the mod component.
   */
  includeIntegrations?: boolean;
};

/**
 * Returns browser permissions required to run the ModComponentBase
 * - ModComponent
 * - Blocks
 * - Services (optional, default=true)
 * - StarterBrick (optional, default=true)
 *
 * @see ModComponentBase.permissions
 * @see StarterBrick.permissions
 * @see checkExtensionPermissions
 */
export async function collectModComponentPermissions(
  modComponent: ModComponentBase,
  options: PermissionOptions = {},
): Promise<Permissions.Permissions> {
  const { includeStarterBrick = true, includeIntegrations = true } = options;
  const resolved = await hydrateModComponentInnerDefinitions(modComponent);

  const starterBrick =
    options.starterBrick ??
    (await starterBrickRegistry.lookup(resolved.extensionPointId));

  let integrationPermissions: Permissions.Permissions[] = [];

  if (includeIntegrations) {
    integrationPermissions = await Promise.all(
      (resolved.integrationDependencies ?? [])
        .filter(({ configId }) => configId)
        .map(async (integrationDependency) =>
          collectIntegrationOriginPermissions(integrationDependency),
        ),
    );
  }

  const bricks = await starterBrick.getBricks(resolved);
  const brickPermissions = bricks.map((x) => x.permissions);

  return mergePermissions(
    compact([
      modComponent.permissions ?? {},
      includeStarterBrick ? starterBrick.permissions : null,
      ...integrationPermissions,
      ...brickPermissions,
    ]),
  );
}

/**
 * Check the status of permissions for one or more ModComponentBases.
 * @param modComponentOrModComponents the mod component or mod components to check
 */
export async function checkExtensionPermissions(
  modComponentOrModComponents: ModComponentBase | ModComponentBase[],
): Promise<PermissionsStatus> {
  const permissions = mergePermissions(
    await Promise.all(
      castArray(modComponentOrModComponents).map(async (x) =>
        collectModComponentPermissions(x),
      ),
    ),
  );

  return {
    permissions,
    hasPermissions: await browser.permissions.contains(permissions),
  };
}
