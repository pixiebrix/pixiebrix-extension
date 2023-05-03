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
  type RecipeDefinition,
  type ResolvedExtensionDefinition,
} from "@/types/recipeTypes";
import { type ServiceAuthPair } from "@/types/serviceTypes";
import { resolveRecipe } from "@/registry/internal";
import {
  ensurePermissionsFromUserGesture,
  mergePermissions,
} from "@/permissions/permissionsUtils";
import { containsPermissions } from "@/background/messenger/api";
import { isEmpty } from "lodash";
import { type Permissions } from "webextension-polyfill";
import extensionPointRegistry from "@/extensionPoints/registry";
import { type IExtension } from "@/types/extensionTypes";
import { serviceOriginPermissions } from "@/permissions/servicePermissionsHelpers";
import { collectExtensionPermissions } from "@/permissions/extensionPermissionsHelpers";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";

async function collectExtensionDefinitionPermissions(
  extensionPoints: ResolvedExtensionDefinition[],
  serviceAuths: ServiceAuthPair[]
): Promise<Permissions.Permissions> {
  const servicePromises = serviceAuths.map(async (serviceAuth) =>
    serviceOriginPermissions(serviceAuth)
  );

  const extensionPointPromises = extensionPoints.map(
    async ({ id, permissions = {}, config }: ResolvedExtensionDefinition) => {
      const extensionPoint = await extensionPointRegistry.lookup(id);

      let inner: Permissions.Permissions = {};
      try {
        // XXX: we don't have the types right now to type ExtensionPointConfig. In practice, the config as-is should
        //  provide the structure required by getBlocks. Really, the argument of extensionPermissions should be changed
        //  to not depend on irrelevant information, e.g., the uuid of the extension. This will also involve changing
        //  the type of getBlocks on the ExtensionPoint interface
        inner = await collectExtensionPermissions(
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
 * Returns true if the recipe has the necessary permissions to run. Does not request the permissions.
 * @param recipe the recipe definition
 * @param selectedAuths selected integration configurations
 * @see ensureRecipePermissionsFromUserGesture
 */
export async function checkRecipePermissions(
  recipe: Pick<RecipeDefinition, "definitions" | "extensionPoints">,
  selectedAuths: ServiceAuthPair[]
): Promise<PermissionsStatus> {
  const extensionDefinitions = await resolveRecipe(recipe);
  const permissions = await collectExtensionDefinitionPermissions(
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
 * Ensures that the recipe has the necessary permissions to run. If not, prompts the user to grant them. NOTE: Must
 * be called from a user gesture.
 * @param recipe the recipe definition
 * @param selectedAuths selected integration configurations
 * @see checkRecipePermissions
 */
export async function ensureRecipePermissionsFromUserGesture(
  recipe: RecipeDefinition,
  selectedAuths: ServiceAuthPair[]
): Promise<boolean> {
  const resolved = await resolveRecipe(recipe);
  const collectedPermissions = await collectExtensionDefinitionPermissions(
    resolved,
    selectedAuths
  );

  if (isEmpty(collectedPermissions)) {
    // Small performance enhancement to avoid hitting background worker
    return true;
  }

  const hasPermissions = await containsPermissions(collectedPermissions);

  // Skip request if we already know we have permissions
  if (hasPermissions) {
    return true;
  }

  return ensurePermissionsFromUserGesture(collectedPermissions);
}
