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

import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { checkExtensionPermissions } from "@/permissions/modComponentPermissionsHelpers";
import useAsyncState from "@/hooks/useAsyncState";
import { fallbackValue } from "@/utils/asyncStateUtils";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";
import useExtensionPermissions from "@/permissions/useExtensionPermissions";
import useRequestPermissionsCallback from "@/permissions/useRequestPermissionsCallback";
import type { ModInstance } from "@/types/modInstanceTypes";
import { mapModInstanceToActivatedModComponents } from "@/store/modComponents/modInstanceUtils";

// By default, assume the extension has required permissions.
const noRequiredPermissionsStatus: PermissionsStatus = {
  hasPermissions: true,
  permissions: emptyPermissionsFactory(),
};

/**
 * WARNING: This hook swallows errors (to simplify the behavior for the mods screen).
 * Outside the `ModsPage` you probably want to use useAsyncState with `collectModComponentPermissions`
 * @see collectModComponentPermissions
 */
function useModPermissions(modInstances: ModInstance[]): {
  hasPermissions: boolean;
  requestPermissions: () => Promise<boolean>;
} {
  const { data: browserPermissions, isSuccess } = useExtensionPermissions();

  const { data } = fallbackValue(
    useAsyncState(async () => {
      if (isSuccess && modInstances.length > 0) {
        const modComponents = modInstances.flatMap((x) =>
          mapModInstanceToActivatedModComponents(x),
        );
        return checkExtensionPermissions(modComponents);
      }

      return noRequiredPermissionsStatus;
    }, [modInstances, browserPermissions, isSuccess]),
    noRequiredPermissionsStatus,
  );

  const { permissions, hasPermissions } = data;

  const requestPermissions = useRequestPermissionsCallback(permissions);

  return {
    hasPermissions,
    requestPermissions,
  };
}

export default useModPermissions;
