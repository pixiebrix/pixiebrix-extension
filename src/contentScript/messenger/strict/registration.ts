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

import {
  hideSidebar,
  showSidebar,
  sidebarWasLoaded,
  updateSidebar,
  removeExtensions as removeSidebars,
  reloadSidebar,
  getReservedPanelEntries,
} from "@/contentScript/sidebarController";
import { handleMenuAction } from "@/contentScript/contextMenus";
import {
  getFormDefinition,
  resolveForm,
  cancelForm,
} from "@/contentScript/ephemeralFormProtocol";
import { getProcesses, initRobot } from "@/contentScript/uipath";
import { checkAvailable } from "@/bricks/available";
import notify from "@/utils/notify";
import { getState, setState } from "@/platform/state/pageState";
import {
  cancelTemporaryPanels,
  getPanelDefinition,
  resolveTemporaryPanel,
  stopWaitingForTemporaryPanels,
} from "@/bricks/transformers/temporaryInfo/temporaryPanelProtocol";
import { closeWalkthroughModal } from "@/contentScript/walkthroughModalProtocol";
import showWalkthroughModal from "@/components/walkthroughModal/showWalkthroughModal";
import { registerMethods } from "webext-messenger";

declare global {
  interface MessengerMethods {
    FORM_GET_DEFINITION: typeof getFormDefinition;
    FORM_RESOLVE: typeof resolveForm;
    FORM_CANCEL: typeof cancelForm;
    UPDATE_SIDEBAR: typeof updateSidebar;
    SIDEBAR_WAS_LOADED: typeof sidebarWasLoaded;
    SHOW_SIDEBAR: typeof showSidebar;
    HIDE_SIDEBAR: typeof hideSidebar;
    RELOAD_SIDEBAR: typeof reloadSidebar;
    REMOVE_SIDEBARS: typeof removeSidebars;
    HANDLE_MENU_ACTION: typeof handleMenuAction;
    GET_RESERVED_SIDEBAR_ENTRIES: typeof getReservedPanelEntries;
    UIPATH_INIT: typeof initRobot;
    UIPATH_GET_PROCESSES: typeof getProcesses;
    CHECK_AVAILABLE: typeof checkAvailable;
    GET_PAGE_STATE: typeof getState;
    SET_PAGE_STATE: typeof setState;
    NOTIFY_INFO: typeof notify.info;
    NOTIFY_ERROR: typeof notify.error;
    NOTIFY_SUCCESS: typeof notify.success;
    TEMPORARY_PANEL_CLOSE: typeof stopWaitingForTemporaryPanels;
    TEMPORARY_PANEL_CANCEL: typeof cancelTemporaryPanels;
    TEMPORARY_PANEL_RESOLVE: typeof resolveTemporaryPanel;
    PANEL_GET_DEFINITION: typeof getPanelDefinition;
    WALKTHROUGH_MODAL_CLOSE: typeof closeWalkthroughModal;
    WALKTHROUGH_MODAL_SHOW: typeof showWalkthroughModal;
  }
}
export default function registerMessenger(): void {
  registerMethods({
    FORM_GET_DEFINITION: getFormDefinition,
    FORM_RESOLVE: resolveForm,
    FORM_CANCEL: cancelForm,
    UPDATE_SIDEBAR: updateSidebar,
    SIDEBAR_WAS_LOADED: sidebarWasLoaded,
    SHOW_SIDEBAR: showSidebar,
    HIDE_SIDEBAR: hideSidebar,
    RELOAD_SIDEBAR: reloadSidebar,
    REMOVE_SIDEBARS: removeSidebars,
    HANDLE_MENU_ACTION: handleMenuAction,
    GET_RESERVED_SIDEBAR_ENTRIES: getReservedPanelEntries,
    UIPATH_INIT: initRobot,
    UIPATH_GET_PROCESSES: getProcesses,
    CHECK_AVAILABLE: checkAvailable,
    GET_PAGE_STATE: getState,
    SET_PAGE_STATE: setState,
    NOTIFY_INFO: notify.info,
    NOTIFY_ERROR: notify.error,
    NOTIFY_SUCCESS: notify.success,
    TEMPORARY_PANEL_CLOSE: stopWaitingForTemporaryPanels,
    TEMPORARY_PANEL_CANCEL: cancelTemporaryPanels,
    TEMPORARY_PANEL_RESOLVE: resolveTemporaryPanel,
    PANEL_GET_DEFINITION: getPanelDefinition,
    WALKTHROUGH_MODAL_CLOSE: closeWalkthroughModal,
    WALKTHROUGH_MODAL_SHOW: showWalkthroughModal,
  });
}
