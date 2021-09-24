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
import { getContentScriptMethod } from "webext-messenger";
import { browser } from "webextension-polyfill-ts";
import { isContentScript } from "webext-detect-page";

// TODO: This should be a hard error, but due to unknown dependency routes, it can't be enforced yet
if (isContentScript()) {
  console.trace(
    "This should not have been imported in the content script. Use the API directly instead."
  );
}

export const getFormDefinition = getContentScriptMethod("FORM_GET_DEFINITION");
export const resolveForm = getContentScriptMethod("FORM_RESOLVE");
export const cancelForm = getContentScriptMethod("FORM_CANCEL");
export const queueReactivateTab = getContentScriptMethod(
  "QUEUE_REACTIVATE_TAB"
);
export const reactivateTab = getContentScriptMethod("REACTIVATE_TAB");
export const handleMenuAction = getContentScriptMethod("HANDLE_MENU_ACTION");
export const toggleActionPanel = getContentScriptMethod("TOGGLE_ACTION_PANEL");
export const showActionPanel = getContentScriptMethod("SHOW_ACTION_PANEL");
export const hideActionPanel = getContentScriptMethod("HIDE_ACTION_PANEL");
export const removeActionPanel = getContentScriptMethod("REMOVE_ACTION_PANEL");
export const insertPanel = getContentScriptMethod("INSERT_PANEL");
export const insertButton = getContentScriptMethod("INSERT_BUTTON");

export const initRobot = getContentScriptMethod("UIPATH_INIT");
export const getProcesses = getContentScriptMethod("UIPATH_GET_PROCESSES");
export const searchWindow = getContentScriptMethod("SEARCH_WINDOW");
export const detectFrameworks = getContentScriptMethod("DETECT_FRAMEWORKS");

export const runBlock = getContentScriptMethod("RUN_SINGLE_BLOCK");
export const runReaderBlock = getContentScriptMethod("RUN_READER_BLOCK");
export const runReader = getContentScriptMethod("RUN_READER");
export const readSelected = getContentScriptMethod("READ_SELECTED");

export const clearDynamicElements = getContentScriptMethod(
  "CLEAR_DYNAMIC_ELEMENTS"
);
export const updateDynamicElement = getContentScriptMethod(
  "UPDATE_DYNAMIC_ELEMENT"
);
export const enableOverlay = getContentScriptMethod("ENABLE_OVERLAY");
export const disableOverlay = getContentScriptMethod("DISABLE_OVERLAY");
export const getInstalledExtensionPointIds = getContentScriptMethod(
  "INSTALLED_EXTENSIONS"
);
export const checkAvailable = getContentScriptMethod("CHECK_AVAILABLE");
export const handleNavigate = getContentScriptMethod("HANDLE_NAVIGATE");
export const showNotification = getContentScriptMethod("SHOW_NOTIFICATION");

// Temporary, webext-messenger depends on this global
(globalThis as any).browser = browser;
