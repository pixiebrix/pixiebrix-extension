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

import {
  type ModDefinition,
  type ResolvedModComponentDefinition,
} from "@/types/modDefinitionTypes";
import { type IntegrationConfigPair } from "@/types/integrationTypes";
import { resolveRecipeInnerDefinitions } from "@/registry/internal";
import {
  ensurePermissionsFromUserGesture,
  mergePermissions,
} from "@/permissions/permissionsUtils";
import { containsPermissions } from "@/background/messenger/api";
import { isEmpty } from "lodash";
import { type Permissions } from "webextension-polyfill";
import extensionPointRegistry from "@/starterBricks/registry";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { collectServiceOriginPermissions } from "@/permissions/servicePermissionsHelpers";
import { collectExtensionPermissions } from "@/permissions/extensionPermissionsHelpers";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";

async function collectModComponentDefinitionPermissions(
  modComponentDefinitions: ResolvedModComponentDefinition[],
  serviceAuths: IntegrationConfigPair[]
): Promise<Permissions.Permissions> {
  const servicePromises = serviceAuths.map(async (serviceAuth) =>
    collectServiceOriginPermissions(serviceAuth)
  );

  const modComponentPromises = modComponentDefinitions.map(
    async ({
      id,
      permissions = {},
      config,
    }: ResolvedModComponentDefinition) => {
      const extensionPoint = await extensionPointRegistry.lookup(id);

      let inner: Permissions.Permissions = {};
      try {
        // XXX: we don't have the types right now to type StarterBrickConfig. In practice, the config as-is should
        //  provide the structure required by getBlocks. Really, the argument of extensionPermissions should be changed
        //  to not depend on irrelevant information, e.g., the uuid of the extension. This will also involve changing
        //  the type of getBlocks on the ExtensionPoint interface
        inner = await collectExtensionPermissions(
          { config } as unknown as ModComponentBase,
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
    ...modComponentPromises,
  ]);

  return mergePermissions(permissionsList);
}

/**
 * Returns true if the mod definition has the necessary permissions to run. Does not request the permissions.
 * @param modDefinition the mod definition
 * @param selectedAuths selected integration configurations
 * @see ensureModDefinitionPermissionsFromUserGesture
 */
export async function checkModDefinitionPermissions(
  modDefinition: Pick<ModDefinition, "definitions" | "extensionPoints">,
  selectedAuths: IntegrationConfigPair[]
): Promise<PermissionsStatus> {
  const extensionDefinitions = await resolveRecipeInnerDefinitions(
    modDefinition
  );
  const permissions = await collectModComponentDefinitionPermissions(
    extensionDefinitions,
    selectedAuths
  );

  if (isEmpty(permissions)) {
    // Small performance enhancement to avoid hitting background worker
    return {
      hasPermissions: true,
      permissions,
    };
  }

  return {
    hasPermissions: await containsPermissions(permissions),
    permissions,
  };
}

/**
 * Ensures that the mod definition has the necessary permissions to run. If not, prompts the user to grant them. NOTE: Must
 * be called from a user gesture.
 * @param modDefinition the mod definition
 * @param selectedAuths selected integration configurations
 * @see checkModDefinitionPermissions
 */
export async function ensureModDefinitionPermissionsFromUserGesture(
  modDefinition: ModDefinition,
  selectedAuths: IntegrationConfigPair[]
): Promise<boolean> {
  // Single method to make mocking in tests easier
  return ensurePermissionsFromUserGesture(
    await checkModDefinitionPermissions(modDefinition, selectedAuths)
  );
}
