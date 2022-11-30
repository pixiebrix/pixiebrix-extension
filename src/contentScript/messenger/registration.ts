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
import { expectContext } from "@/utils/expectContext";
import { handleMenuAction } from "@/contentScript/contextMenus";
import {
  getInstalled,
  handleNavigate,
  queueReactivateTab,
  reactivateTab,
  removeExtension,
} from "@/contentScript/lifecycle";
import {
  getFormDefinition,
  resolveForm,
  cancelForm,
} from "@/contentScript/ephemeralFormProtocol";
import {
  hideSidebar,
  showSidebar,
  rehydrateSidebar,
  removeExtension as removeSidebar,
  reloadSidebar,
} from "@/contentScript/sidebarController";
import { insertPanel } from "@/contentScript/nativeEditor/insertPanel";
import { insertButton } from "@/contentScript/nativeEditor/insertButton";
import {
  clearDynamicElements,
  disableOverlay,
  enableOverlay,
  runExtensionPointReader,
  updateDynamicElement,
} from "@/contentScript/nativeEditor/dynamic";
import { getProcesses, initRobot } from "@/contentScript/uipath";
import {
  withDetectFrameworkVersions,
  withSearchWindow,
} from "@/messaging/protocol";
import {
  runBlock,
  runReaderBlock,
  runReader,
  readSelected,
  resetTab,
  runRendererBlock,
} from "@/contentScript/pageEditor";
import { checkAvailable } from "@/blocks/available";
import notify from "@/utils/notify";
import { runBrick } from "@/contentScript/executor";
import {
  cancelSelect,
  selectElement,
  stopInspectingNativeHandler,
} from "@/contentScript/nativeEditor/elementPicker";
import {
  runEffectPipeline,
  runMapArgs,
  runRendererPipeline,
} from "@/contentScript/pipelineProtocol";
import { toggleQuickBar } from "@/components/quickBar/QuickBarApp";
import { getPageState, setPageState } from "@/contentScript/pageState";
import { stopWaitingForTemporaryPanels } from "@/blocks/transformers/temporaryInfo/temporaryPanelProtocol";
import { getReadyState } from "@/contentScript/ready";

expectContext("contentScript");

declare global {
  interface MessengerMethods {
    GET_READY_STATE: typeof getReadyState;

    FORM_GET_DEFINITION: typeof getFormDefinition;
    FORM_RESOLVE: typeof resolveForm;
    FORM_CANCEL: typeof cancelForm;
    TEMPORARY_PANEL_CLOSE: typeof stopWaitingForTemporaryPanels;

    QUEUE_REACTIVATE_TAB: typeof queueReactivateTab;
    REACTIVATE_TAB: typeof reactivateTab;
    REMOVE_EXTENSION: typeof removeExtension;
    RESET_TAB: typeof resetTab;

    TOGGLE_QUICK_BAR: typeof toggleQuickBar;
    HANDLE_MENU_ACTION: typeof handleMenuAction;
    REHYDRATE_SIDEBAR: typeof rehydrateSidebar;
    SHOW_SIDEBAR: typeof showSidebar;
    HIDE_SIDEBAR: typeof hideSidebar;
    RELOAD_SIDEBAR: typeof reloadSidebar;
    REMOVE_SIDEBAR: typeof removeSidebar;

    INSERT_PANEL: typeof insertPanel;
    INSERT_BUTTON: typeof insertButton;

    UIPATH_INIT: typeof initRobot;
    UIPATH_GET_PROCESSES: typeof getProcesses;

    SEARCH_WINDOW: typeof withSearchWindow;
    DETECT_FRAMEWORKS: typeof withDetectFrameworkVersions;
    RUN_SINGLE_BLOCK: typeof runBlock;
    RUN_RENDERER_BLOCK: typeof runRendererBlock;
    RUN_READER_BLOCK: typeof runReaderBlock;
    RUN_READER: typeof runReader;
    READ_SELECTED: typeof readSelected;

    CLEAR_DYNAMIC_ELEMENTS: typeof clearDynamicElements;
    UPDATE_DYNAMIC_ELEMENT: typeof updateDynamicElement;
    RUN_EXTENSION_POINT_READER: typeof runExtensionPointReader;
    ENABLE_OVERLAY: typeof enableOverlay;
    DISABLE_OVERLAY: typeof disableOverlay;
    INSTALLED_EXTENSION_POINTS: typeof getInstalled;
    CHECK_AVAILABLE: typeof checkAvailable;
    HANDLE_NAVIGATE: typeof handleNavigate;
    RUN_BRICK: typeof runBrick;
    CANCEL_SELECT_ELEMENT: typeof cancelSelect;
    SELECT_ELEMENT: typeof selectElement;
    STOP_INSPECTING_NATIVE: typeof stopInspectingNativeHandler;

    RUN_RENDERER_PIPELINE: typeof runRendererPipeline;
    RUN_EFFECT_PIPELINE: typeof runEffectPipeline;
    RUN_MAP_ARGS: typeof runMapArgs;

    NOTIFY_INFO: typeof notify.info;
    NOTIFY_ERROR: typeof notify.error;
    NOTIFY_SUCCESS: typeof notify.success;

    GET_PAGE_STATE: typeof getPageState;
    SET_PAGE_STATE: typeof setPageState;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    GET_READY_STATE: getTargetState,

    FORM_GET_DEFINITION: getFormDefinition,
    FORM_RESOLVE: resolveForm,
    FORM_CANCEL: cancelForm,
    TEMPORARY_PANEL_CLOSE: stopWaitingForTemporaryPanels,

    QUEUE_REACTIVATE_TAB: queueReactivateTab,
    REACTIVATE_TAB: reactivateTab,
    REMOVE_EXTENSION: removeExtension,
    RESET_TAB: resetTab,

    TOGGLE_QUICK_BAR: toggleQuickBar,
    HANDLE_MENU_ACTION: handleMenuAction,
    REHYDRATE_SIDEBAR: rehydrateSidebar,
    SHOW_SIDEBAR: showSidebar,
    HIDE_SIDEBAR: hideSidebar,
    RELOAD_SIDEBAR: reloadSidebar,
    REMOVE_SIDEBAR: removeSidebar,

    INSERT_PANEL: insertPanel,
    INSERT_BUTTON: insertButton,

    UIPATH_INIT: initRobot,
    UIPATH_GET_PROCESSES: getProcesses,

    SEARCH_WINDOW: withSearchWindow,
    DETECT_FRAMEWORKS: withDetectFrameworkVersions,
    RUN_SINGLE_BLOCK: runBlock,
    RUN_RENDERER_BLOCK: runRendererBlock,
    RUN_READER_BLOCK: runReaderBlock,
    RUN_READER: runReader,
    READ_SELECTED: readSelected,

    CLEAR_DYNAMIC_ELEMENTS: clearDynamicElements,
    UPDATE_DYNAMIC_ELEMENT: updateDynamicElement,
    RUN_EXTENSION_POINT_READER: runExtensionPointReader,
    ENABLE_OVERLAY: enableOverlay,
    DISABLE_OVERLAY: disableOverlay,
    INSTALLED_EXTENSION_POINTS: getInstalled,
    CHECK_AVAILABLE: checkAvailable,
    HANDLE_NAVIGATE: handleNavigate,

    RUN_BRICK: runBrick,
    CANCEL_SELECT_ELEMENT: cancelSelect,
    SELECT_ELEMENT: selectElement,
    STOP_INSPECTING_NATIVE: stopInspectingNativeHandler,

    RUN_RENDERER_PIPELINE: runRendererPipeline,
    RUN_EFFECT_PIPELINE: runEffectPipeline,
    RUN_MAP_ARGS: runMapArgs,

    NOTIFY_INFO: notify.info,
    NOTIFY_ERROR: notify.error,
    NOTIFY_SUCCESS: notify.success,

    GET_PAGE_STATE: getPageState,
    SET_PAGE_STATE: setPageState,
  });
}
