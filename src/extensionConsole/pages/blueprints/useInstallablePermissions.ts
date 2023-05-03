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

import { type IExtension } from "@/types/extensionTypes";
import { useCallback } from "react";
import {
  emptyPermissionsFactory,
  ensurePermissionsFromUserGesture,
} from "@/permissions/permissionsUtils";
import { checkExtensionPermissions } from "@/permissions/extensionPermissionsHelpers";
import useAsyncState from "@/hooks/useAsyncState";
import { fallbackValue } from "@/utils/asyncStateUtils";
import { type PermissionsStatus } from "@/permissions/permissionsTypes";

// By default, assume the extensions have permissions so that the UI can optimistically render the state
const fallback: PermissionsStatus = {
  hasPermissions: true,
  permissions: emptyPermissionsFactory(),
};

/**
 * WARNING: This hook swallows errors (to simplify the behavior for the blueprints page.
 * Outside of the `BlueprintsPage` you probably want to use useAsyncState with `collectExtensionPermissions`
 * @see collectExtensionPermissions
 */
function useInstallablePermissions(extensions: IExtension[]): {
  hasPermissions: boolean;
  requestPermissions: () => Promise<boolean>;
} {
  const {
    data: { hasPermissions, permissions },
  } = fallbackValue(
    useAsyncState(
      async () => checkExtensionPermissions(extensions),
      [extensions]
    ),
    fallback
  );

  const requestPermissions = useCallback(async () => {
    const accepted = await ensurePermissionsFromUserGesture(permissions);

    if (accepted) {
      // TODO: in the future, listen for a permissions event in this hook so the status can update without redirecting the page
      // Reload the extension console page so all the Grant Permissions buttons are in sync.
      location.reload();
    }

    return accepted;
  }, [permissions]);

  return {
    hasPermissions,
    requestPermissions,
  };
}

export default useInstallablePermissions;
