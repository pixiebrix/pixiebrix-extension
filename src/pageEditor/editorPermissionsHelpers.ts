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

import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import { collectExtensionPermissions } from "@/permissions/extensionPermissionsHelpers";
import {
  ensurePermissionsFromUserGesture,
  mergePermissionsStatuses,
} from "@/permissions/permissionsUtils";
import notify from "@/utils/notify";
import { type Permissions } from "webextension-polyfill";
import { castArray } from "lodash";
import { containsPermissions } from "@/background/messenger/api";

export async function calculatePermissionsForElement(
  element: FormState
): Promise<{
  hasPermissions: boolean;
  permissions: Permissions.Permissions;
}> {
  const adapter = ADAPTERS.get(element.type);

  const { extension, extensionPointConfig } = adapter.asDynamicElement(element);

  const extensionPoint = extensionPointFactory(extensionPointConfig);

  // Pass the extensionPoint in directly because the foundation will not have been saved/added to the
  // registry at this point when called from useCreate
  const permissions = await collectExtensionPermissions(extension, {
    extensionPoint,
  });

  const hasPermissions = await containsPermissions(permissions);

  return { hasPermissions, permissions };
}

/**
 * Prompt the user to grant permissions if needed, and return whether PixieBrix has the required permissions.
 * @param elementOrElements the Page Editor element form state(s)
 */
export async function ensureElementPermissionsFromUserGesture(
  elementOrElements: FormState | FormState[]
): Promise<boolean> {
  try {
    const elementPermissions = await Promise.all(
      castArray(elementOrElements).map(async (element) =>
        calculatePermissionsForElement(element)
      )
    );

    const { hasPermissions: alreadyHasPermissions, permissions } =
      mergePermissionsStatuses(elementPermissions);

    if (alreadyHasPermissions) {
      return true;
    }

    const hasPermissions = await ensurePermissionsFromUserGesture(permissions);

    if (!hasPermissions) {
      notify.warning(
        "You declined the permissions. This mod won't work on other tabs until you grant the permissions"
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
