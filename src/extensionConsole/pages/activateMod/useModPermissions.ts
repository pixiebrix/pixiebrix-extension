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

import useAsyncState from "@/hooks/useAsyncState";
import { integrationConfigLocator } from "@/background/messenger/api";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { checkModDefinitionPermissions } from "@/modDefinitions/modDefinitionPermissionsHelpers";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type AsyncState } from "@/types/sliceTypes";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";
import useRequestPermissionsCallback from "@/permissions/useRequestPermissionsCallback";
import useExtensionPermissions from "@/permissions/useExtensionPermissions";
import { type IntegrationDependency } from "@/integrations/integrationTypes";

type ModPermissionsState = AsyncState<PermissionsStatus> & {
  /**
   * Callback to request permissions from the user.
   */
  request: () => Promise<boolean>;
};

/**
 * Hook providing convenience methods for ensuring permissions for a mod prior to activation.
 * @param modDefinition the mod definition
 * @param configuredDependencies the integration configurations selected for mod activation
 * @see useCloudExtensionPermissions
 */
function useModPermissions(
  modDefinition: ModDefinition,
  configuredDependencies: IntegrationDependency[],
): ModPermissionsState {
  const { data: browserPermissions } = useExtensionPermissions();

  const permissionsState = useAsyncState(
    async () => {
      // Refresh integration configurations because the user may have created a team integration since the last refresh.
      await integrationConfigLocator.refresh();
      return checkModDefinitionPermissions(
        modDefinition,
        configuredDependencies,
      );
    },
    [configuredDependencies, browserPermissions],
    {
      initialValue: {
        hasPermissions: true,
        permissions: emptyPermissionsFactory(),
      } as PermissionsStatus,
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

export default useModPermissions;
