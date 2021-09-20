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

/* Do not use `registerMethod` in this file */
import { getMethod } from "webext-messenger";
import { browser } from "webextension-polyfill-ts";
import { isBackgroundPage } from "webext-detect-page";

// TODO: This should be a hard error, but due to unknown dependency routes, it can't be enforced yet
if (isBackgroundPage()) {
  console.trace(
    "This should not have been imported in the background page. Use the API directly instead."
  );
}

// Chrome offers this API in more contexts than Firefox, so it skips the messenger entirely
export const containsPermissions = browser.permissions
  ? browser.permissions.contains
  : getMethod("CONTAINS_PERMISSIONS");

export const openPopupPrompt = getMethod("OPEN_POPUP_PROMPT");
export const whoAmI = getMethod("ECHO_SENDER");
export const activateTab = getMethod("ACTIVATE_TAB");
export const closeTab = getMethod("CLOSE_TAB");
export const markTabAsReady = getMethod("MARK_TAB_AS_READY");

/**
 * Uninstall context menu and return whether or not the context menu was uninstalled.
 */
export const uninstallContextMenu = getMethod("UNINSTALL_CONTEXT_MENU");
export const ensureContextMenu = getMethod("ENSURE_CONTEXT_MENU");
export const openTab = getMethod("OPEN_TAB");

// Temporary, webext-messenger depends on this global
(globalThis as any).browser = browser;
