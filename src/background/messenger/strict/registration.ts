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
import { ensureContentScript } from "@/background/contentScript";
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
} from "@/background/auth/authStorage";
import { setToolbarBadge } from "@/background/toolbarBadge";
import { rememberFocus } from "@/utils/focusTracker";
import writeToClipboard from "@/background/clipboard";
import * as registry from "@/registry/packageRegistry";

expectContext("background");

declare global {
  interface MessengerMethods {
    SHOW_MY_SIDE_PANEL: typeof showMySidePanel;
    INJECT_SCRIPT: typeof ensureContentScript;
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
    SET_TOOLBAR_BADGE: typeof setToolbarBadge;
    DOCUMENT_RECEIVED_FOCUS: typeof rememberFocus;
    WRITE_TO_CLIPBOARD: typeof writeToClipboard;
    REGISTRY_SYNC: typeof registry.syncPackages;
    REGISTRY_CLEAR: typeof registry.clear;
    REGISTRY_GET_BY_KINDS: typeof registry.getByKinds;
    REGISTRY_FIND: typeof registry.find;
    QUERY_TABS: typeof browser.tabs.query;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    SHOW_MY_SIDE_PANEL: showMySidePanel,
    INJECT_SCRIPT: ensureContentScript,
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
    SET_TOOLBAR_BADGE: setToolbarBadge,
    DOCUMENT_RECEIVED_FOCUS: rememberFocus,
    WRITE_TO_CLIPBOARD: writeToClipboard,
    REGISTRY_SYNC: registry.syncPackages,
    REGISTRY_CLEAR: registry.clear,
    REGISTRY_GET_BY_KINDS: registry.getByKinds,
    REGISTRY_FIND: registry.find,
    QUERY_TABS: browser.tabs.query,
  });
}
