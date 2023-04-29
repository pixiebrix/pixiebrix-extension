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

import notify from "@/utils/notify";
import useAsyncState from "@/hooks/useAsyncState";
import {
  collectPermissions,
  emptyPermissions,
  ensureAllPermissions,
} from "@/permissions";
import { resolveRecipe } from "@/registry/internal";
import { containsPermissions, services } from "@/background/messenger/api";
import { useCallback } from "react";
import { type Permissions } from "webextension-polyfill";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type ServiceAuthPair } from "@/types/serviceTypes";
import { type AsyncState } from "@/types/sliceTypes";

type PermissionsData = {
  /**
   * True if PixieBrix already has all the required permissions.
   */
  enabled: boolean;

  /**
   * Permissions computed for the blueprint and selected service configurations.
   */
  permissions: Permissions.Permissions;
};

type AsyncPermissionsState = AsyncState<PermissionsData> & {
  /**
   * Callback to request calculated permissions. Returns the true if the user accepted the permissions.
   */
  request: () => Promise<boolean>;
};

/**
 * Hook providing convenience methods for ensuring permissions for a recipe prior to activation.
 * @param blueprint the blueprint definition
 * @param serviceAuths the integration configurations selected for blueprint activation
 */
function useEnsurePermissions(
  blueprint: RecipeDefinition,
  serviceAuths: ServiceAuthPair[]
): AsyncPermissionsState {
  const state = useAsyncState(
    async () => {
      // Refresh services because the user may have created a team integration since the last refresh.
      await services.refresh();
      const permissions = await collectPermissions(
        await resolveRecipe(blueprint),
        serviceAuths
      );
      const enabled = await containsPermissions(permissions);
      return {
        enabled,
        permissions,
      };
    },
    [serviceAuths],
    {
      initialValue: {
        enabled: false,
        permissions: emptyPermissions,
      },
    }
  );

  const request = useCallback(async () => {
    let accepted = false;

    try {
      accepted = await ensureAllPermissions(state.data.permissions);
    } catch (error) {
      notify.error({
        message: "Error granting permissions",
        error,
      });
      return false;
    }

    if (!accepted) {
      // Event is tracked in `activate` callback
      notify.warning("You declined the permissions");
      return false;
    }

    return true;
  }, [state.data.permissions]);

  return {
    request,
    ...state,
  };
}

export default useEnsurePermissions;
