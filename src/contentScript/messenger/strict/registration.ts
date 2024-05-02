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
  hideMv2SidebarInTopFrame,
  showSidebarInTopFrame,
  sidebarWasLoaded,
  updateSidebar,
  removeExtensions as removeSidebars,
  getReservedPanelEntries,
} from "@/contentScript/sidebarController";
import { handleMenuAction } from "@/contentScript/contextMenus";
import {
  getFormDefinition,
  resolveForm,
  cancelForm,
} from "@/platform/forms/formController";
import { getProcesses, initRobot } from "@/contentScript/uipath";
import { checkAvailable } from "@/bricks/available";
import notify from "@/utils/notify";
import { getState, setState } from "@/platform/state/stateController";
import {
  cancelTemporaryPanels,
  getPanelDefinition,
  resolveTemporaryPanel,
  stopWaitingForTemporaryPanels,
} from "@/platform/panels/panelController";
import { closeWalkthroughModal } from "@/contentScript/walkthroughModalProtocol";
import showWalkthroughModal from "@/components/walkthroughModal/showWalkthroughModal";
import { registerMethods } from "webext-messenger";
import { toggleQuickBar } from "@/components/quickBar/QuickBarApp";
import { cancelSelect } from "@/contentScript/pageEditor/elementPicker";
import { reloadActivationEnhancements } from "@/contentScript/loadActivationEnhancementsCore";
import { getAttributeExamples } from "@/contentScript/pageEditor/elementInformation";
import selectElement from "@/contentScript/pageEditor/selectElement";
import { insertPanel } from "@/contentScript/pageEditor/insertPanel";
import { insertButton } from "@/contentScript/pageEditor/insertButton";
import {
  disableOverlay,
  enableOverlay,
} from "@/contentScript/pageEditor/dynamic/overlay";

declare global {
  interface MessengerMethods {
    FORM_GET_DEFINITION: typeof getFormDefinition;
    FORM_RESOLVE: typeof resolveForm;
    FORM_CANCEL: typeof cancelForm;
    UPDATE_SIDEBAR: typeof updateSidebar;
    SIDEBAR_WAS_LOADED: typeof sidebarWasLoaded;
    SHOW_SIDEBAR: typeof showSidebarInTopFrame;
    HIDE_SIDEBAR: typeof hideMv2SidebarInTopFrame;
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
    TOGGLE_QUICK_BAR: typeof toggleQuickBar;
    CANCEL_SELECT_ELEMENT: typeof cancelSelect;
    RELOAD_MARKETPLACE_ENHANCEMENTS: typeof reloadActivationEnhancements;
    GET_ATTRIBUTE_EXAMPLES: typeof getAttributeExamples;
    SELECT_ELEMENT: typeof selectElement;
    INSERT_PANEL: typeof insertPanel;
    INSERT_BUTTON: typeof insertButton;
    ENABLE_OVERLAY: typeof enableOverlay;
    DISABLE_OVERLAY: typeof disableOverlay;
  }
}
export default function registerMessenger(): void {
  registerMethods({
    FORM_GET_DEFINITION: getFormDefinition,
    FORM_RESOLVE: resolveForm,
    FORM_CANCEL: cancelForm,
    UPDATE_SIDEBAR: updateSidebar,
    SIDEBAR_WAS_LOADED: sidebarWasLoaded,
    SHOW_SIDEBAR: showSidebarInTopFrame,
    HIDE_SIDEBAR: hideMv2SidebarInTopFrame,
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
    TOGGLE_QUICK_BAR: toggleQuickBar,
    CANCEL_SELECT_ELEMENT: cancelSelect,
    RELOAD_MARKETPLACE_ENHANCEMENTS: reloadActivationEnhancements,
    GET_ATTRIBUTE_EXAMPLES: getAttributeExamples,
    SELECT_ELEMENT: selectElement,
    INSERT_PANEL: insertPanel,
    INSERT_BUTTON: insertButton,
    ENABLE_OVERLAY: enableOverlay,
    DISABLE_OVERLAY: disableOverlay,
  });
}
