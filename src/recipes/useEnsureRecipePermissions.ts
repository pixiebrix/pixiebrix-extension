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
import { services } from "@/background/messenger/api";
import { useCallback } from "react";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type ServiceAuthPair } from "@/types/serviceTypes";
import { checkRecipePermissions } from "@/recipes/recipePermissionsHelpers";
import {
  emptyPermissionsFactory,
  ensureAllPermissionsFromUserGesture,
} from "@/permissions/permissionsUtils";
import { type AsyncState } from "@/types/sliceTypes";
import { fallbackValue } from "@/utils/asyncStateUtils";
import { type Permissions } from "webextension-polyfill";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";

type EnsurePermissionsState = AsyncState<PermissionsStatus> & {
  /**
   * Callback to request permissions from the user.
   */
  request: () => Promise<boolean>;
};

/**
 * Hook providing convenience methods for ensuring permissions for a recipe prior to activation.
 * @param blueprint the blueprint definition
 * @param serviceAuths the integration configurations selected for blueprint activation
 */
function useEnsureRecipePermissions(
  blueprint: RecipeDefinition,
  serviceAuths: ServiceAuthPair[]
): EnsurePermissionsState {
  const state = fallbackValue(
    useAsyncState(async () => {
      // Refresh services because the user may have created a team integration since the last refresh.
      await services.refresh();
      return checkRecipePermissions(blueprint, serviceAuths);
    }, [serviceAuths]),
    {
      hasPermissions: false,
      permissions: emptyPermissionsFactory() as Permissions.Permissions,
    }
  );

  const { permissions } = state.data;

  const request = useCallback(async () => {
    let accepted = false;

    try {
      accepted = await ensureAllPermissionsFromUserGesture(permissions);
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
  }, [permissions]);

  return {
    ...state,
    request,
  };
}

export default useEnsureRecipePermissions;
