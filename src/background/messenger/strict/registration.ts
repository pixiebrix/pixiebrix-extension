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

/* Do not use `getMethod` in this file; Keep only registrations here, not implementations */
import { registerMethods } from "webext-messenger";
import { expectContext } from "@/utils/expectContext";
import { showMySidePanel } from "@/background/sidePanel";
import { waitForContentScript } from "@/background/contentScript";
import { getRecord, setRecord } from "@/background/dataStore";
import initTheme from "@/background/initTheme";
import {
  addTraceEntry,
  addTraceExit,
  clearExtensionTraces,
  clearTraces,
} from "@/telemetry/trace";
import { captureTab } from "@/background/capture";
import {
  deleteCachedAuthData,
  getCachedAuthData,
  hasCachedAuthData,
} from "@/background/auth/authStorage";
import { setToolbarBadge } from "@/background/toolbarBadge";
import { rememberFocus } from "@/utils/focusTracker";
import writeToClipboardInFocusedContext from "@/background/clipboard";
import * as registry from "@/registry/packageRegistry";
import serviceRegistry from "@/integrations/registry";
import { getUserData } from "@/auth/authStorage";
import {
  clearExtensionDebugLogs,
  clearLog,
  clearLogs,
  recordError,
  recordLog,
} from "@/telemetry/logging";
import { fetchFeatureFlags } from "@/auth/featureFlagStorage";
import { locator, refreshServices } from "@/background/locator";

expectContext("background");

declare global {
  interface MessengerMethods {
    SHOW_MY_SIDE_PANEL: typeof showMySidePanel;
    WAIT_FOR_CONTENT_SCRIPT: typeof waitForContentScript;
    GET_DATA_STORE: typeof getRecord;
    SET_DATA_STORE: typeof setRecord;
    ACTIVATE_THEME: typeof initTheme;
    ADD_TRACE_ENTRY: typeof addTraceEntry;
    ADD_TRACE_EXIT: typeof addTraceExit;
    CLEAR_TRACES: typeof clearExtensionTraces;
    CLEAR_ALL_TRACES: typeof clearTraces;
    CAPTURE_TAB: typeof captureTab;
    DELETE_CACHED_AUTH: typeof deleteCachedAuthData;
    GET_CACHED_AUTH: typeof getCachedAuthData;
    HAS_CACHED_AUTH: typeof hasCachedAuthData;
    SET_TOOLBAR_BADGE: typeof setToolbarBadge;
    DOCUMENT_RECEIVED_FOCUS: typeof rememberFocus;
    WRITE_TO_CLIPBOARD_IN_FOCUSED_DOCUMENT: typeof writeToClipboardInFocusedContext;
    REGISTRY_SYNC: typeof registry.syncPackages;
    REGISTRY_CLEAR: typeof registry.clear;
    REGISTRY_GET_BY_KINDS: typeof registry.getByKinds;
    REGISTRY_FIND: typeof registry.find;
    QUERY_TABS: typeof browser.tabs.query;
    FETCH_FEATURE_FLAGS: typeof fetchFeatureFlags;

    CLEAR_SERVICE_CACHE: typeof serviceRegistry.clear;
    GET_USER_DATA: typeof getUserData;
    RECORD_LOG: typeof recordLog;
    RECORD_ERROR: typeof recordError;
    CLEAR_LOGS: typeof clearLogs;
    CLEAR_LOG: typeof clearLog;
    CLEAR_EXTENSION_DEBUG_LOGS: typeof clearExtensionDebugLogs;

    LOCATE_SERVICES_FOR_ID: typeof locator.locateAllForService;
    LOCATE_SERVICE: typeof locator.locate;
    REFRESH_SERVICES: typeof refreshServices;
    LOCATOR_REFRESH_LOCAL: typeof locator.refreshLocal;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    SHOW_MY_SIDE_PANEL: showMySidePanel,
    WAIT_FOR_CONTENT_SCRIPT: waitForContentScript,
    GET_DATA_STORE: getRecord,
    SET_DATA_STORE: setRecord,
    ACTIVATE_THEME: initTheme,
    ADD_TRACE_ENTRY: addTraceEntry,
    ADD_TRACE_EXIT: addTraceExit,
    CLEAR_TRACES: clearExtensionTraces,
    CLEAR_ALL_TRACES: clearTraces,
    CAPTURE_TAB: captureTab,
    DELETE_CACHED_AUTH: deleteCachedAuthData,
    GET_CACHED_AUTH: getCachedAuthData,
    HAS_CACHED_AUTH: hasCachedAuthData,
    SET_TOOLBAR_BADGE: setToolbarBadge,
    DOCUMENT_RECEIVED_FOCUS: rememberFocus,
    WRITE_TO_CLIPBOARD_IN_FOCUSED_DOCUMENT: writeToClipboardInFocusedContext,
    REGISTRY_SYNC: registry.syncPackages,
    REGISTRY_CLEAR: registry.clear,
    REGISTRY_GET_BY_KINDS: registry.getByKinds,
    REGISTRY_FIND: registry.find,
    QUERY_TABS: browser.tabs.query,
    FETCH_FEATURE_FLAGS: fetchFeatureFlags,

    CLEAR_SERVICE_CACHE: serviceRegistry.clear.bind(serviceRegistry),
    GET_USER_DATA: getUserData,
    RECORD_LOG: recordLog,
    RECORD_ERROR: recordError,
    CLEAR_LOGS: clearLogs,
    CLEAR_LOG: clearLog,
    CLEAR_EXTENSION_DEBUG_LOGS: clearExtensionDebugLogs,

    LOCATE_SERVICES_FOR_ID: locator.locateAllForService.bind(locator),
    LOCATE_SERVICE: locator.locate.bind(locator),
    LOCATOR_REFRESH_LOCAL: locator.refreshLocal.bind(locator),
    REFRESH_SERVICES: refreshServices,
  });
}
