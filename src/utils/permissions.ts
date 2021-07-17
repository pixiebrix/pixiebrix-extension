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
import { openPopupPrompt } from "@/background/popup";
import { expectBackgroundPage } from "@/utils/expectContext";

export function selectOptionalPermissions(
  permissions: string[]
): Manifest.OptionalPermission[] {
  const { optional_permissions } = chrome.runtime.getManifest();
  return permissions.filter((requestedPermission) =>
    optional_permissions.includes(requestedPermission)
  ) as Manifest.OptionalPermission[];
}

/**
 * Merge a list of permissions into a single permissions object.
 * @param permissions
 */
export function mergePermissions(
  permissions: Permissions.Permissions[] = []
): Permissions.Permissions {
  return {
    origins: uniq(permissions.flatMap((x) => x.origins ?? [])),
    permissions: uniq(permissions.flatMap((x) => x.permissions ?? [])),
  };
}

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

const _containsPermissions = liftBackground(
  "CONTAINS_PERMISSIONS",
  async (permissions: Permissions.AnyPermissions) =>
    browser.permissions.contains(permissions)
);

export async function containsPermissions(
  permissions: Permissions.AnyPermissions
): Promise<boolean> {
  if ("permissions" in browser) {
    return browser.permissions.contains(permissions);
  }

  return _containsPermissions(permissions);
}

// TODO: Make it work outside the dev tools as well
export async function requestPermissions(
  permissions: Permissions.Permissions
): Promise<boolean> {
  if ("permissions" in browser) {
    return browser.permissions.request(permissions);
  }

  if (await containsPermissions(permissions)) {
    return true;
  }

  const page = new URL(browser.runtime.getURL("popups/permissionsPopup.html"));
  for (const origin of permissions.origins) {
    page.searchParams.append("origin", origin);
  }
  for (const origin of permissions.permissions) {
    page.searchParams.append("permission", origin);
  }

  const tabId = browser.devtools.inspectedWindow.tabId;
  await openPopupPrompt(tabId, page.toString());
  return containsPermissions(permissions);
}

export function registerPermissionPolyfillHandlers() {
  expectBackgroundPage();
}
