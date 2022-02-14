/* eslint-disable filenames/match-exported */
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

/* Do not use `getMethod` in this file; Keep only registrations here, not implementations */
import { registerMethods } from "webext-messenger";
import browser from "webextension-polyfill";
import { expectContext } from "@/utils/expectContext";
import * as sheets from "@/contrib/google/sheets/handlers";
import {
  ensureContextMenu,
  uninstallContextMenu,
  preloadContextMenus,
} from "@/background/contextMenus";
import { openPopupPrompt } from "@/background/permissionPrompt";
import {
  activateTab,
  closeTab,
  whoAmI,
  openTab,
  requestRunOnServer,
  requestRunInOpener,
  requestRunInTarget,
  requestRunInBroadcast,
  waitForTargetByUrl,
} from "@/background/executor";
import * as registry from "@/registry/localRegistry";
import { ensureContentScript } from "@/background/util";
import serviceRegistry from "@/services/registry";
import { deleteCachedAuthData } from "@/background/auth";
import { serializableAxiosRequest, proxyService } from "@/background/requests";
import { readQuery } from "@/contrib/google/bigquery/handlers";
import { getRecord, setRecord } from "@/background/dataStore";
import { getAvailableVersion } from "@/background/installer";
import { locator, refreshServices } from "@/background/locator";
import { reactivateEveryTab } from "@/background/navigation";
import {
  getLoggingConfig,
  recordError,
  recordLog,
  setLoggingConfig,
} from "@/background/logging";
import {
  addTraceEntry,
  addTraceExit,
  clearExtensionTraces,
  clearTraces,
} from "@/telemetry/trace";
import {
  initTelemetry,
  recordEvent,
  sendDeploymentAlert,
} from "@/background/telemetry";
import { captureTab } from "@/background/capture";

expectContext("background");

declare global {
  interface MessengerMethods {
    GOOGLE_SHEETS_GET_TAB_NAMES: typeof sheets.getTabNames;
    GOOGLE_SHEETS_GET_SHEET_PROPERTIES: typeof sheets.getSheetProperties;
    GOOGLE_SHEETS_GET_HEADERS: typeof sheets.getHeaders;
    GOOGLE_SHEETS_CREATE_TAB: typeof sheets.createTab;
    GOOGLE_SHEETS_APPEND_ROWS: typeof sheets.appendRows;
    GOOGLE_SHEETS_BATCH_UPDATE: typeof sheets.batchUpdate;
    GOOGLE_SHEETS_BATCH_GET: typeof sheets.batchGet;

    GET_AVAILABLE_VERSION: typeof getAvailableVersion;
    INJECT_SCRIPT: typeof ensureContentScript;
    CONTAINS_PERMISSIONS: typeof browser.permissions.contains;
    PRELOAD_CONTEXT_MENUS: typeof preloadContextMenus;
    UNINSTALL_CONTEXT_MENU: typeof uninstallContextMenu;
    ENSURE_CONTEXT_MENU: typeof ensureContextMenu;
    OPEN_POPUP_PROMPT: typeof openPopupPrompt;

    ECHO_SENDER: typeof whoAmI;
    WAIT_FOR_TARGET_BY_URL: typeof waitForTargetByUrl;

    ACTIVATE_TAB: typeof activateTab;
    REACTIVATE_EVERY_TAB: typeof reactivateEveryTab;
    CLOSE_TAB: typeof closeTab;
    OPEN_TAB: typeof openTab;
    REGISTRY_GET_KIND: typeof registry.getKind;
    REGISTRY_SYNC: typeof registry.syncRemote;
    REGISTRY_FIND: typeof registry.find;
    LOCATE_SERVICE: typeof locator.locate;
    REFRESH_SERVICES: typeof refreshServices;

    REQUEST_RUN_ON_SERVER: typeof requestRunOnServer;
    REQUEST_RUN_IN_OPENER: typeof requestRunInOpener;
    REQUEST_RUN_IN_TARGET: typeof requestRunInTarget;
    REQUEST_RUN_IN_ALL: typeof requestRunInBroadcast;

    HTTP_REQUEST: typeof serializableAxiosRequest;
    DELETE_CACHED_AUTH: typeof deleteCachedAuthData;
    PROXY: typeof proxyService;
    CLEAR_SERVICE_CACHE: VoidFunction;
    GOOGLE_BIGQUERY_READ: typeof readQuery;

    GET_DATA_STORE: typeof getRecord;
    SET_DATA_STORE: typeof setRecord;

    RECORD_LOG: typeof recordLog;
    RECORD_ERROR: typeof recordError;
    RECORD_EVENT: typeof recordEvent;
    GET_LOGGING_CONFIG: typeof getLoggingConfig;
    SET_LOGGING_CONFIG: typeof setLoggingConfig;

    ADD_TRACE_ENTRY: typeof addTraceEntry;
    ADD_TRACE_EXIT: typeof addTraceExit;
    CLEAR_TRACES: typeof clearExtensionTraces;
    CLEAR_ALL_TRACES: typeof clearTraces;

    INIT_TELEMETRY: typeof initTelemetry;
    SEND_DEPLOYMENT_ALERT: typeof sendDeploymentAlert;

    CAPTURE_TAB: typeof captureTab;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    GOOGLE_SHEETS_GET_TAB_NAMES: sheets.getTabNames,
    GOOGLE_SHEETS_GET_SHEET_PROPERTIES: sheets.getSheetProperties,
    GOOGLE_SHEETS_GET_HEADERS: sheets.getHeaders,
    GOOGLE_SHEETS_CREATE_TAB: sheets.createTab,
    GOOGLE_SHEETS_APPEND_ROWS: sheets.appendRows,
    GOOGLE_SHEETS_BATCH_UPDATE: sheets.batchUpdate,
    GOOGLE_SHEETS_BATCH_GET: sheets.batchGet,

    GET_AVAILABLE_VERSION: getAvailableVersion,
    INJECT_SCRIPT: ensureContentScript,
    CONTAINS_PERMISSIONS: browser.permissions.contains,

    PRELOAD_CONTEXT_MENUS: preloadContextMenus,
    UNINSTALL_CONTEXT_MENU: uninstallContextMenu,
    ENSURE_CONTEXT_MENU: ensureContextMenu,
    OPEN_POPUP_PROMPT: openPopupPrompt,

    ECHO_SENDER: whoAmI,
    WAIT_FOR_TARGET_BY_URL: waitForTargetByUrl,

    ACTIVATE_TAB: activateTab,
    REACTIVATE_EVERY_TAB: reactivateEveryTab,
    CLOSE_TAB: closeTab,
    OPEN_TAB: openTab,
    REGISTRY_GET_KIND: registry.getKind,
    REGISTRY_SYNC: registry.syncRemote,
    REGISTRY_FIND: registry.find,
    LOCATE_SERVICE: locator.locate.bind(locator),
    REFRESH_SERVICES: refreshServices,

    REQUEST_RUN_ON_SERVER: requestRunOnServer,
    REQUEST_RUN_IN_OPENER: requestRunInOpener,
    REQUEST_RUN_IN_TARGET: requestRunInTarget,
    REQUEST_RUN_IN_ALL: requestRunInBroadcast,

    HTTP_REQUEST: serializableAxiosRequest,
    DELETE_CACHED_AUTH: deleteCachedAuthData,
    CLEAR_SERVICE_CACHE: serviceRegistry.clear.bind(serviceRegistry),
    PROXY: proxyService,
    GOOGLE_BIGQUERY_READ: readQuery,

    GET_DATA_STORE: getRecord,
    SET_DATA_STORE: setRecord,

    RECORD_LOG: recordLog,
    RECORD_ERROR: recordError,
    RECORD_EVENT: recordEvent,
    GET_LOGGING_CONFIG: getLoggingConfig,
    SET_LOGGING_CONFIG: setLoggingConfig,

    ADD_TRACE_ENTRY: addTraceEntry,
    ADD_TRACE_EXIT: addTraceExit,
    CLEAR_TRACES: clearExtensionTraces,
    CLEAR_ALL_TRACES: clearTraces,

    INIT_TELEMETRY: initTelemetry,
    SEND_DEPLOYMENT_ALERT: sendDeploymentAlert,

    CAPTURE_TAB: captureTab,
  });
}
