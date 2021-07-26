/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { browser, Manifest, Permissions } from "webextension-polyfill-ts";
import uniq from "lodash/uniq";
import groupBy from "lodash/groupBy";
import sortBy from "lodash/sortBy";
import { liftBackground } from "@/background/protocol";
import { openPopupPrompt } from "@/background/permissionPrompt";

/** Filters out any permissions that are not part of `optional_permissions` */
export function selectOptionalPermissions(
  permissions: string[]
): Manifest.OptionalPermission[] {
  const { optional_permissions } = chrome.runtime.getManifest();
  return permissions.filter((requestedPermission) =>
    optional_permissions.includes(requestedPermission)
  ) as Manifest.OptionalPermission[];
}

/** Merge a list of permissions into a single permissions object */
export function mergePermissions(
  permissions: Permissions.Permissions[] = []
): Required<Permissions.Permissions> {
  return {
    origins: uniq(permissions.flatMap((x) => x.origins ?? [])),
    permissions: uniq(permissions.flatMap((x) => x.permissions ?? [])),
  };
}

/**
 * @deprecated The logic of grouping permissions by origin doesn't actually make sense
 * as we don't currently have any way to enforce permissions on a per-origin basis.
 * https://github.com/pixiebrix/pixiebrix-extension/pull/828#discussion_r671703130
 */
export function distinctPermissions(
  permissions: Permissions.Permissions[]
): Permissions.Permissions[] {
  return Object.values(
    groupBy(permissions, (x) => JSON.stringify(sortBy(x.origins)))
  ).map((perms) => ({
    permissions: uniq(perms.flatMap((x) => x.permissions || [])),
    origins: perms[0].origins,
  }));
}

const containsPermissionsInBackground = liftBackground(
  "CONTAINS_PERMISSIONS",
  async (permissions: Permissions.AnyPermissions) =>
    browser.permissions.contains(permissions)
);

export async function containsPermissions(
  permissions: Permissions.AnyPermissions
): Promise<boolean> {
  if (browser.permissions) {
    return browser.permissions.contains(permissions);
  }

  return containsPermissionsInBackground(permissions);
}

// TODO: Make it work in content scripts as well, or any context that doesn't have the API
/** An alternative API to permissions.request() that works in Firefox’ Dev Tools */
export async function requestPermissions(
  permissions: Permissions.Permissions
): Promise<boolean> {
  if (browser.permissions) {
    return browser.permissions.request(permissions);
  }

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
  const tabId = browser.devtools.inspectedWindow.tabId;
  await openPopupPrompt(tabId, page.toString());
  return containsPermissions(permissions);
}
