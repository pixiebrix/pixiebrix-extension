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
  emptyPermissionsFactory,
  ensurePermissionsFromUserGesture,
} from "@/permissions/permissionsUtils";
import notify from "@/utils/notify";
import { useCallback } from "react";
import { type Permissions } from "webextension-polyfill";

function useRequestPermissionsCallback(
  permissions: Permissions.Permissions | null
): () => Promise<boolean> {
  return useCallback(async () => {
    let accepted = false;

    try {
      accepted = await ensurePermissionsFromUserGesture(
        permissions ?? emptyPermissionsFactory()
      );
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
}

export default useRequestPermissionsCallback;
