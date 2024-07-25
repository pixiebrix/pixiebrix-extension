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

import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { fromJS as starterBrickFactory } from "@/starterBricks/factory";
import { collectModComponentPermissions } from "@/permissions/modComponentPermissionsHelpers";
import {
  ensurePermissionsFromUserGesture,
  mergePermissionsStatuses,
} from "@/permissions/permissionsUtils";
import notify from "@/utils/notify";
import { type Permissions } from "webextension-polyfill";
import { castArray } from "lodash";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";

export async function calculatePermissionsForModComponentFormState(
  modComponentFormState: ModComponentFormState,
): Promise<{ hasPermissions: boolean; permissions: Permissions.Permissions }> {
  const { asDraftModComponent } = adapterForComponent(modComponentFormState);

  const {
    extension: modComponent,
    extensionPointConfig: starterBrickDefinition,
  } = asDraftModComponent(modComponentFormState);

  const starterBrick = starterBrickFactory(starterBrickDefinition);

  // Pass the starter brick directly because the foundation will not have been saved/added to the
  // registry at this point when called from useCreate
  const permissions = await collectModComponentPermissions(modComponent, {
    starterBrick,
  });

  const hasPermissions = await browser.permissions.contains(permissions);

  return { hasPermissions, permissions };
}

/**
 * Prompt the user to grant permissions if needed, and return whether PixieBrix has the required permissions.
 * @param modComponentFormStates the Page Editor mod component form state(s)
 */
export async function ensureModComponentFormStatePermissionsFromUserGesture(
  modComponentFormStates: ModComponentFormState | ModComponentFormState[],
): Promise<boolean> {
  try {
    const modComponentPermissions = await Promise.all(
      castArray(modComponentFormStates).map(async (formState) =>
        calculatePermissionsForModComponentFormState(formState),
      ),
    );

    const { hasPermissions: alreadyHasPermissions, permissions } =
      mergePermissionsStatuses(modComponentPermissions);

    if (alreadyHasPermissions) {
      return true;
    }

    const hasPermissions = await ensurePermissionsFromUserGesture(permissions);

    if (!hasPermissions) {
      notify.warning(
        "You declined the permissions. This mod won't work on other tabs until you grant the permissions",
      );
    }

    return hasPermissions;
  } catch (error) {
    console.error("Error checking/enabling permissions", { error });
    notify.warning({
      message: "Error verifying permissions",
      error,
      reportError: true,
    });

    return false;
  }
}
