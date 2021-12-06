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

/* Do not use `getMethod` in this file; Keep only registrations here, not implementations */
import { registerMethods } from "webext-messenger";
import browser from "webextension-polyfill";
import { expectContext } from "@/utils/expectContext";
import * as sheets from "@/contrib/google/sheets/handlers";
import {
  ensureContextMenu,
  uninstallContextMenu,
} from "@/background/contextMenus";
import { openPopupPrompt } from "@/background/permissionPrompt";
import {
  activateTab,
  closeTab,
  markTabAsReady,
  whoAmI,
  openTab,
  executeOnServer,
} from "@/background/executor";
import * as registry from "@/registry/localRegistry";
import { checkTargetPermissions, ensureContentScript } from "@/background/util";
import serviceRegistry from "@/services/registry";
import { deleteCachedAuthData } from "@/background/auth";
import { doCleanAxiosRequest, _proxyService } from "@/background/requests";
import { readQuery } from "@/contrib/google/bigquery/handlers";
import { getRecord, setRecord } from "@/background/dataStore";
import { preloadContextMenus } from "@/background/initContextMenus";
import { getAvailableVersion } from "@/background/installer";
import { locator, refreshServices } from "@/background/locator";
import { reactivateEveryTab } from "@/background/navigation";

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
    CHECK_TARGET_PERMISSIONS: typeof checkTargetPermissions;
    CONTAINS_PERMISSIONS: typeof browser.permissions.contains;
    PRELOAD_CONTEXT_MENUS: typeof preloadContextMenus;
    UNINSTALL_CONTEXT_MENU: typeof uninstallContextMenu;
    ENSURE_CONTEXT_MENU: typeof ensureContextMenu;
    OPEN_POPUP_PROMPT: typeof openPopupPrompt;

    ECHO_SENDER: typeof whoAmI;
    ACTIVATE_TAB: typeof activateTab;
    REACTIVATE_EVERY_TAB: typeof reactivateEveryTab;
    CLOSE_TAB: typeof closeTab;
    MARK_TAB_AS_READY: typeof markTabAsReady;
    OPEN_TAB: typeof openTab;
    REGISTRY_GET_KIND: typeof registry.getKind;
    REGISTRY_SYNC: typeof registry.syncRemote;
    REGISTRY_FIND: typeof registry.find;
    LOCATE_SERVICE: typeof locator.locate;
    REFRESH_SERVICE: typeof refreshServices;

    EXECUTE_ON_SERVER: typeof executeOnServer;

    HTTP_REQUEST: typeof doCleanAxiosRequest;
    DELETE_CACHED_AUTH: typeof deleteCachedAuthData;
    PROXY: typeof _proxyService;
    CLEAR_SERVICE_CACHE: VoidFunction;
    GOOGLE_BIGQUERY_READ: typeof readQuery;

    GET_DATA_STORE: typeof getRecord;
    SET_DATA_STORE: typeof setRecord;
  }
}

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
  CHECK_TARGET_PERMISSIONS: checkTargetPermissions,
  CONTAINS_PERMISSIONS: browser.permissions.contains,

  PRELOAD_CONTEXT_MENUS: preloadContextMenus,
  UNINSTALL_CONTEXT_MENU: uninstallContextMenu,
  ENSURE_CONTEXT_MENU: ensureContextMenu,
  OPEN_POPUP_PROMPT: openPopupPrompt,

  ECHO_SENDER: whoAmI,
  ACTIVATE_TAB: activateTab,
  REACTIVATE_EVERY_TAB: reactivateEveryTab,
  CLOSE_TAB: closeTab,
  MARK_TAB_AS_READY: markTabAsReady,
  OPEN_TAB: openTab,
  REGISTRY_GET_KIND: registry.getKind,
  REGISTRY_SYNC: registry.syncRemote,
  REGISTRY_FIND: registry.find,
  LOCATE_SERVICE: locator.locate.bind(locator),
  REFRESH_SERVICE: refreshServices,

  EXECUTE_ON_SERVER: executeOnServer,

  HTTP_REQUEST: doCleanAxiosRequest,
  DELETE_CACHED_AUTH: deleteCachedAuthData,
  CLEAR_SERVICE_CACHE: serviceRegistry.clear.bind(serviceRegistry),
  PROXY: _proxyService,
  GOOGLE_BIGQUERY_READ: readQuery,

  GET_DATA_STORE: getRecord,
  SET_DATA_STORE: setRecord,
});
