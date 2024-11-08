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

import {
  type ModDefinition,
  type HydratedModComponentDefinition,
} from "@/types/modDefinitionTypes";
import { type IntegrationDependency } from "../integrations/integrationTypes";
import { hydrateModInnerDefinitions } from "../registry/hydrateInnerDefinitions";
import { mergePermissions } from "../permissions/permissionsUtils";
import { isEmpty } from "lodash";
import { type Permissions } from "webextension-polyfill";
import starterBrickRegistry from "../starterBricks/registry";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { collectIntegrationOriginPermissions } from "../integrations/util/permissionsHelpers";
import { collectModComponentPermissions } from "../permissions/modComponentPermissionsHelpers";
import { type PermissionsStatus } from "../permissions/permissionsTypes";
import type { Manifest } from "webextension-polyfill/namespaces/manifest";

async function collectModComponentDefinitionPermissions(
  modComponentDefinitions: HydratedModComponentDefinition[],
  configuredDependencies: IntegrationDependency[],
): Promise<Permissions.Permissions> {
  const integrationsPromises = configuredDependencies.map(async (dependency) =>
    collectIntegrationOriginPermissions(dependency),
  );

  const modComponentPromises = modComponentDefinitions.map(
    async ({
      id,
      permissions = {},
      config,
    }: HydratedModComponentDefinition) => {
      const extensionPoint = await starterBrickRegistry.lookup(id);

      let inner: Permissions.Permissions = {};
      try {
        // XXX: we don't have the types right now to type StarterBrickConfig. In practice, the config as-is should
        //  provide the structure required by getBlocks. Really, the argument of extensionPermissions should be changed
        //  to not depend on irrelevant information, e.g., the uuid of the extension. This will also involve changing
        //  the type of getBlocks on the ExtensionPoint interface
        inner = await collectModComponentPermissions(
          { config } as unknown as ModComponentBase,
          {
            starterBrick: extensionPoint,
          },
        );
      } catch (error) {
        console.warn("Error getting blocks for extensionPoint %s", id, {
          error,
          config,
        });
      }

      return mergePermissions([extensionPoint.permissions, permissions, inner]);
    },
  );

  const permissionsList = await Promise.all([
    ...integrationsPromises,
    ...modComponentPromises,
  ]);

  return mergePermissions(permissionsList);
}

/**
 * Returns true if the mod definition has the necessary permissions to run. Does not request the permissions.
 * @param modDefinition the mod definition
 * @param configuredDependencies mod integration dependencies with defined configs
 * @param optionalPermissions permissions to ignore when calculating hasPermissions. Used to allow auto-deployment
 * of mods using `clipboardWrite` permission.
 * @see ensureModDefinitionPermissionsFromUserGesture
 */
export async function checkModDefinitionPermissions(
  modDefinition: Pick<ModDefinition, "definitions" | "extensionPoints">,
  configuredDependencies: IntegrationDependency[],
  {
    optionalPermissions = [],
  }: {
    optionalPermissions?: Manifest.OptionalPermission[];
  } = {},
): Promise<PermissionsStatus> {
  const extensionDefinitions = await hydrateModInnerDefinitions(modDefinition);

  const permissions = await collectModComponentDefinitionPermissions(
    extensionDefinitions,
    configuredDependencies,
  );

  const requiredPermissions = {
    permissions: permissions.permissions?.filter(
      (permission) => !optionalPermissions.includes(permission),
    ),
    origins: permissions.origins,
  };

  if (isEmpty(requiredPermissions)) {
    // Small performance enhancement to avoid hitting permissions API
    return {
      hasPermissions: true,
      permissions,
    };
  }

  return {
    hasPermissions: await browser.permissions.contains(requiredPermissions),
    permissions,
  };
}
