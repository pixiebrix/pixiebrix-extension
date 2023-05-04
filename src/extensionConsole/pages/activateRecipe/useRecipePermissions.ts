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

import useAsyncState from "@/hooks/useAsyncState";
import { services as serviceLocator } from "@/background/messenger/api";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type ServiceAuthPair } from "@/types/serviceTypes";
import { checkRecipePermissions } from "@/recipes/recipePermissionsHelpers";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type AsyncState } from "@/types/sliceTypes";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";
import useRequestPermissionsCallback from "@/permissions/useRequestPermissionsCallback";
import useExtensionPermissions from "@/permissions/useExtensionPermissions";

type RecipePermissionsState = AsyncState<PermissionsStatus> & {
  /**
   * Callback to request permissions from the user.
   */
  request: () => Promise<boolean>;
};

/**
 * Hook providing convenience methods for ensuring permissions for a recipe prior to activation.
 * @param blueprint the blueprint definition
 * @param serviceAuths the integration configurations selected for blueprint activation
 * @see useCloudExtensionPermissions
 */
function useRecipePermissions(
  blueprint: RecipeDefinition,
  serviceAuths: ServiceAuthPair[]
): RecipePermissionsState {
  const { data: browserPermissions } = useExtensionPermissions();

  const permissionsState = useAsyncState(
    async () => {
      // Refresh services because the user may have created a team integration since the last refresh.
      await serviceLocator.refresh();
      return checkRecipePermissions(blueprint, serviceAuths);
    },
    [serviceAuths, browserPermissions],
    {
      initialValue: {
        hasPermissions: true,
        permissions: emptyPermissionsFactory(),
      } as PermissionsStatus,
    }
  );

  const request = useRequestPermissionsCallback(
    permissionsState.data?.permissions
  );

  return {
    ...permissionsState,
    request,
  };
}

export default useRecipePermissions;
