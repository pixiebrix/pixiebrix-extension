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

import { type Manifest, type Permissions } from "webextension-polyfill";
import { castArray, cloneDeep, remove, uniq } from "lodash";
import {
  containsPermissions,
  openPopupPrompt,
} from "@/background/messenger/api";
import { isScriptableUrl as _isScriptableUrl } from "webext-content-scripts";
import { isUrlPermittedByManifest } from "webext-additional-permissions";
import {
  getTabUrl,
  canAccessTab as _canAccessTab,
  type Target,
} from "webext-tools";
import {
  isPermissionsStatus,
  type PermissionsStatus,
} from "@/permissions/permissionsTypes";

// Copied from the `permissions` section of manifest.json for required permissions
const MANDATORY_PERMISSIONS = new Set([
  "activeTab",
  "storage",
  "identity",
  "tabs",
  "webNavigation",
  "contextMenus",
]);

/**
 * Returns an empty-set of permissions.
 */
export function emptyPermissionsFactory(): Required<Permissions.Permissions> {
  return { origins: [], permissions: [] };
}

/**
 * Exclude MANDATORY_PERMISSIONS that were already granted on install. Firefox errors when you request a permission
 * that's in the permissions, but not the optional_permissions
 */
function normalizeOptionalPermissions(
  permissions: Permissions.Permissions
): Required<Permissions.Permissions> {
  if (permissions == null) {
    return emptyPermissionsFactory();
  }

  return {
    origins: uniq(castArray(permissions.origins ?? [])),
    permissions: uniq(
      castArray(permissions.permissions ?? []).filter(
        (permission) => !MANDATORY_PERMISSIONS.has(permission)
      )
    ),
  };
}

/** Filters to only include permissions that are part of `optional_permissions` */
export function selectOptionalPermissions(
  permissions: string[]
): Manifest.OptionalPermission[] {
  const { optional_permissions } = browser.runtime.getManifest();
  return permissions.filter((requestedPermission) =>
    optional_permissions.includes(requestedPermission)
  ) as Manifest.OptionalPermission[];
}

/**
 * Merge a list of permissions into a single permissions object
 * @see mergePermissionsStatuses
 */
export function mergePermissions(
  permissions: Permissions.Permissions[] = []
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
  statuses: PermissionsStatus[]
): PermissionsStatus {
  return {
    permissions: mergePermissions(statuses.map((x) => x.permissions)),
    hasPermissions: statuses.every((x) => x.hasPermissions),
  };
}

/**
 * Request any permissions the user has not already granted. Must be called from a user gesture.
 * @returns {Promise<boolean>} true iff the all the permissions already existed, or if the user accepted
 * the new permissions.
 */
export async function ensurePermissionsFromUserGesture(
  permissionsOrStatus: Permissions.Permissions | PermissionsStatus
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

  // `normalize` to ensure the request will succeed on Firefox. See normalizeOptionalPermissions
  return requestPermissionsFromUserGesture(
    normalizeOptionalPermissions(permissions)
  );
}

/**
 * An alternative API to permissions.request() that works in Firefox’s Dev Tools.
 * @see ensurePermissionsFromUserGesture
 */
async function requestPermissionsFromUserGesture(
  permissions: Permissions.Permissions
): Promise<boolean> {
  // TODO: Make requestPermissionsFromUserGesture work in contentScripts, or any context that doesn't have the extension API

  // We're going to alter this object so we should clone it
  permissions = cloneDeep(permissions);

  // Don't request permissions for pixiebrix.com, the browser will always show a prompt.
  // We can't use `await containsPermissions()` before `request() `because we might lose the "user action" flag
  // https://github.com/pixiebrix/pixiebrix-extension/issues/1759
  if (Array.isArray(permissions.origins)) {
    remove(permissions.origins, (origin) => isUrlPermittedByManifest(origin));
  }

  // Make request on Chromium. Doesn't show a popup if the permissions already exist.
  if (browser.permissions) {
    return browser.permissions.request(permissions);
  }

  // On Firefox, first check if the permissions already exist to avoid showing the popup.
  if (await containsPermissions(permissions)) {
    return true;
  }

  const page = new URL(browser.runtime.getURL("permissionsPopup.html"));
  for (const origin of permissions.origins ?? []) {
    page.searchParams.append("origin", origin);
  }

  for (const permission of permissions.permissions ?? []) {
    page.searchParams.append("permission", permission);
  }

  // TODO: This only works in the Dev Tools; We should query the current or front-most window
  //  when this is missing in order to make it work in other contexts as well
  const { tabId } = browser.devtools.inspectedWindow;
  await openPopupPrompt(tabId, page.toString());
  return containsPermissions(permissions);
}

/**
 * Determines whether a URL can potentially execute a content script.
 * This excludes non-https URLs and extension gallery pages.
 */
export function isScriptableUrl(url?: string): boolean {
  return url?.startsWith("https") && _isScriptableUrl(url);
}

/**
 * Determines whether PixieBrix can access the tab, depending on permissions and
 * artificial protocol-based limitations
 */
export async function canAccessTab(tab: number | Target): Promise<boolean> {
  const urlPromise = getTabUrl(tab);
  const accessPromise = _canAccessTab(tab);
  // We may have `activeTab` (_canAccessTab), but we don't support non-HTTPS websites (!isScriptableUrl)
  return isScriptableUrl(await urlPromise) && accessPromise;
}
