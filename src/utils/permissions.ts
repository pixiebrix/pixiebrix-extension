/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import browser, { Manifest, Permissions } from "webextension-polyfill";
import { uniq } from "lodash";
import {
  containsPermissions,
  openPopupPrompt,
} from "@/background/messenger/api";
import { isScriptableUrl } from "webext-content-scripts";

/** Filters out any permissions that are not part of `optional_permissions` */
export function selectOptionalPermissions(
  permissions: string[]
): Manifest.OptionalPermission[] {
  const { optional_permissions } = chrome.runtime.getManifest();
  return permissions.filter((requestedPermission) =>
    optional_permissions.includes(
      requestedPermission as chrome.runtime.ManifestPermissions
    )
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
  const { tabId } = browser.devtools.inspectedWindow;
  await openPopupPrompt(tabId, page.toString());
  return containsPermissions(permissions);
}

/**
 * Determines whether a page can potentially execute a content script.
 * This excludes non-http pages and extension gallery pages.
 */
export function canReceiveContentScript(url: string): boolean {
  return url.startsWith("http") && isScriptableUrl(url);
}
