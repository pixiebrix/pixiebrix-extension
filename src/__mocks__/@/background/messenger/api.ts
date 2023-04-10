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

// This mock file provides reasonable defaults for the methods in the background messenger API

/* Do not use `registerMethod` in this file */
import {
  backgroundTarget as bg,
  getMethod,
  getNotifier,
} from "webext-messenger";
import type { AxiosRequestConfig } from "axios";
import type { RemoteResponse } from "@/types/contract";
import { uuidv4 } from "@/types/helpers";
import { SanitizedServiceConfiguration } from "@/types/serviceTypes";

// Chrome offers this API in more contexts than Firefox, so it skips the messenger entirely
export const containsPermissions = browser.permissions
  ? browser.permissions.contains
  : getMethod("CONTAINS_PERMISSIONS", bg);

export const getAvailableVersion = getMethod("GET_AVAILABLE_VERSION", bg);
export const ensureContentScript = getMethod("INJECT_SCRIPT", bg);
export const openPopupPrompt = getMethod("OPEN_POPUP_PROMPT", bg);
export const getUID = jest.fn().mockResolvedValue(uuidv4());
export const waitForTargetByUrl = getMethod("WAIT_FOR_TARGET_BY_URL", bg);

export const activatePartnerTheme = getMethod("ACTIVATE_PARTNER_THEME", bg);
export const getPartnerPrincipals = getMethod("GET_PARTNER_PRINCIPALS", bg);
export const launchAuthIntegration = getMethod("LAUNCH_AUTH_INTEGRATION", bg);

export const activateTab = getMethod("ACTIVATE_TAB", bg);
export const reactivateEveryTab = getNotifier("REACTIVATE_EVERY_TAB", bg);

export const closeTab = getMethod("CLOSE_TAB", bg);
export const deleteCachedAuthData = getMethod("DELETE_CACHED_AUTH", bg);
export const getCachedAuthData = getMethod("GET_CACHED_AUTH", bg);
export const clearServiceCache = getMethod("CLEAR_SERVICE_CACHE", bg);
export const sheets = {
  getTabNames: jest.fn().mockRejectedValue(new Error("Not implemented")),
  getSheetProperties: jest.fn().mockRejectedValue(new Error("Not implemented")),
  getHeaders: jest.fn().mockRejectedValue(new Error("Not implemented")),
  createTab: getMethod("GOOGLE_SHEETS_CREATE_TAB", bg),
  appendRows: getMethod("GOOGLE_SHEETS_APPEND_ROWS", bg),
  batchUpdate: getMethod("GOOGLE_SHEETS_BATCH_UPDATE", bg),
  batchGet: jest.fn().mockRejectedValue(new Error("Not implemented")),
};

/**
 * Uninstall context menu and return whether the context menu was uninstalled.
 */
export const uninstallContextMenu = getMethod("UNINSTALL_CONTEXT_MENU", bg);
export const ensureContextMenu = getMethod("ENSURE_CONTEXT_MENU", bg);
export const openTab = getMethod("OPEN_TAB", bg);

export const registry = {
  fetch: jest.fn().mockResolvedValue(true),
  syncRemote: getMethod("REGISTRY_SYNC", bg),
  getByKinds: jest.fn().mockResolvedValue([]),
  find: jest.fn().mockRejectedValue(new Error("Find not implemented in mock")),
  clear: getMethod("REGISTRY_CLEAR", bg),
};

export const dataStore = {
  get: jest.fn().mockRejectedValue(new Error("Not implemented in mock")),
  set: getMethod("SET_DATA_STORE", bg),
};

export const requestRun = {
  inOpener: getMethod("REQUEST_RUN_IN_OPENER", bg),
  inTarget: getMethod("REQUEST_RUN_IN_TARGET", bg),
  inTop: getMethod("REQUEST_RUN_IN_TOP", bg),
  inAll: getMethod("REQUEST_RUN_IN_ALL", bg),
};

export const contextMenus = {
  preload: getMethod("PRELOAD_CONTEXT_MENUS", bg),
};

export const services = {
  locateAllForId: jest.fn().mockResolvedValue([]),
  locate: jest
    .fn()
    .mockRejectedValue(new Error("Locate not implemented in mock")),
  refresh: getMethod("REFRESH_SERVICES", bg),
  refreshLocal: getMethod("LOCATOR_REFRESH_LOCAL", bg),
};

// `getMethod` currently strips generics, so we must copy the function signature here
export const proxyService = getMethod("PROXY", bg) as <TData>(
  serviceConfig: SanitizedServiceConfiguration | null,
  requestConfig: AxiosRequestConfig
) => Promise<RemoteResponse<TData>>;

// Use this instead: `import reportError from "@/telemetry/reportError"`
// export const recordError = getNotifier("RECORD_ERROR", bg);

export const recordLog = getNotifier("RECORD_LOG", bg);
export const recordWarning = getNotifier("RECORD_WARNING", bg);
export const recordEvent = getNotifier("RECORD_EVENT", bg);
export const clearLogs = getMethod("CLEAR_LOGS", bg);
export const clearLog = getMethod("CLEAR_LOG", bg);
export const clearExtensionDebugLogs = getMethod(
  "CLEAR_EXTENSION_DEBUG_LOGS",
  bg
);

export const traces = {
  addEntry: getNotifier("ADD_TRACE_ENTRY", bg),
  addExit: getNotifier("ADD_TRACE_EXIT", bg),
  clear: getMethod("CLEAR_TRACES", bg),
  clearAll: getNotifier("CLEAR_ALL_TRACES", bg),
};

export const initTelemetry = getNotifier("INIT_TELEMETRY", bg);
export const sendDeploymentAlert = getNotifier("SEND_DEPLOYMENT_ALERT", bg);

export const captureTab = getMethod("CAPTURE_TAB", bg);

export const getUserData = getMethod("GET_USER_DATA", bg);
