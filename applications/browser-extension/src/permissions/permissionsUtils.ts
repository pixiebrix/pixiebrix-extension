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

import { type Manifest, type Permissions } from "webextension-polyfill";
import { uniq } from "lodash";
import {
  isScriptableUrl,
  canAccessTab as _canAccessTab,
} from "webext-content-scripts";
import { extractAdditionalPermissions } from "webext-permissions";
import { getTabUrl, type Target } from "webext-tools";
import {
  isPermissionsStatus,
  type PermissionsStatus,
} from "./permissionsTypes";

/**
 * Returns an empty-set of permissions.
 */
export function emptyPermissionsFactory(): Required<Permissions.Permissions> {
  return { origins: [], permissions: [] };
}

/** Filters to only include permissions that are part of `optional_permissions` */
export function selectOptionalPermissions(
  permissions: string[] = [],
): Manifest.OptionalPermission[] {
  const { optional_permissions = [] } = browser.runtime.getManifest();
  return permissions.filter((requestedPermission) =>
    optional_permissions.includes(requestedPermission),
  ) as Manifest.OptionalPermission[];
}

/**
 * Merge a list of permissions into a single permissions object
 * @see mergePermissionsStatuses
 */
export function mergePermissions(
  permissions: Permissions.Permissions[] = [],
): Required<Permissions.Permissions> {
  return {
    origins: uniq(permissions.flatMap((x) => x.origins ?? [])),
    permissions: uniq(permissions.flatMap((x) => x.permissions ?? [])),
  };
}

/**
 * Merge a list of permissions statuses into a single permissions status object
 * @see mergePermissions
 */
export function mergePermissionsStatuses(
  statuses: PermissionsStatus[],
): PermissionsStatus {
  return {
    permissions: mergePermissions(statuses.map((x) => x.permissions)),
    hasPermissions: statuses.every((x) => x.hasPermissions),
  };
}

/**
 * Request any permissions the user has not already granted. Must be called from a user gesture.
 * @returns true iff the all the permissions already existed, or if the user accepted
 * the new permissions.
 */
export async function ensurePermissionsFromUserGesture(
  permissionsOrStatus: Permissions.Permissions | PermissionsStatus,
): Promise<boolean> {
  if (
    isPermissionsStatus(permissionsOrStatus) &&
    permissionsOrStatus.hasPermissions
  ) {
    return true;
  }

  const permissions = isPermissionsStatus(permissionsOrStatus)
    ? permissionsOrStatus.permissions
    : permissionsOrStatus;

  return browser.permissions.request(
    extractAdditionalPermissions(permissions) as Permissions.Permissions,
  );
}

/**
 * Determines whether PixieBrix can access the tab, depending on permissions and
 * artificial protocol-based limitations
 */
export async function canAccessTab(tab: number | Target): Promise<boolean> {
  const urlPromise = getTabUrl(tab);
  const accessPromise = _canAccessTab(tab);
  return isScriptableUrl(await urlPromise) && accessPromise;
}
