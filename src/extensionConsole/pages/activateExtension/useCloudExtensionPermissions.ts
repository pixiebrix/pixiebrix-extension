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

import { type IntegrationDependency } from "@/integrations/integrationTypes";
import useAsyncState from "@/hooks/useAsyncState";
import { integrationConfigLocator } from "@/background/messenger/api";
import { type StandaloneModDefinition } from "@/types/contract";
import { type AsyncState } from "@/types/sliceTypes";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";
import { checkCloudExtensionPermissions } from "@/permissions/cloudExtensionPermissionsHelpers";
import useRequestPermissionsCallback from "@/permissions/useRequestPermissionsCallback";

type AsyncPermissionsState = AsyncState<PermissionsStatus> & {
  /**
   * Callback to request permissions.
   */
  request: () => Promise<boolean>;
};

/**
 * Hook to check permissions and activate a CloudExtension from the Extension Console.
 * @see useRecipePermissions
 */
function useCloudExtensionPermissions(
  extension: StandaloneModDefinition,
  services: IntegrationDependency[],
): AsyncPermissionsState {
  const permissionsState = useAsyncState(
    async () => {
      // Refresh integration configurations because the user may have created a team integration since the last refresh.
      await integrationConfigLocator.refresh();
      return checkCloudExtensionPermissions(extension, services);
    },
    [extension, services],
    {
      initialValue: {
        hasPermissions: false,
        permissions: emptyPermissionsFactory(),
      },
    },
  );

  const request = useRequestPermissionsCallback(
    permissionsState.data?.permissions,
  );

  return {
    ...permissionsState,
    request,
  };
}

export default useCloudExtensionPermissions;
