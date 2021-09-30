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
import { browser } from "webextension-polyfill-ts";
import { expectContext } from "@/utils/expectContext";
import { handleMenuAction } from "@/contentScript/contextMenus";
import {
  getInstalledIds,
  handleNavigate,
  queueReactivateTab,
  reactivateTab,
} from "@/contentScript/lifecycle";
import {
  getFormDefinition,
  resolveForm,
  cancelForm,
} from "@/contentScript/modalForms";
import {
  hideActionPanel,
  showActionPanel,
  toggleActionPanel,
  removeExtension,
} from "@/actionPanel/native";
import {
  clearDynamicElements,
  disableOverlay,
  enableOverlay,
  insertButton,
  insertPanel,
  updateDynamicElement,
} from "@/nativeEditor";
import { getProcesses, initRobot } from "@/contentScript/uipath";
import { withDetectFrameworkVersions, withSearchWindow } from "@/common";
import {
  runBlock,
  runReaderBlock,
  runReader,
  readSelected,
} from "@/contentScript/devTools";
import { checkAvailable } from "@/blocks/available";
import { showNotification } from "@/contentScript/notify";
import {
  linkChildTab,
  runBlockInContentScript,
} from "@/contentScript/executor";
import { cancelSelect, selectElement } from "@/nativeEditor/selector";

expectContext("contentScript");

// Temporary, webext-messenger depends on this global
(globalThis as any).browser = browser;

declare global {
  interface MessengerMethods {
    FORM_GET_DEFINITION: typeof getFormDefinition;
    FORM_RESOLVE: typeof resolveForm;
    FORM_CANCEL: typeof cancelForm;

    QUEUE_REACTIVATE_TAB: typeof queueReactivateTab;
    REACTIVATE_TAB: typeof reactivateTab;

    HANDLE_MENU_ACTION: typeof handleMenuAction;
    TOGGLE_ACTION_PANEL: typeof toggleActionPanel;
    SHOW_ACTION_PANEL: typeof showActionPanel;
    HIDE_ACTION_PANEL: typeof hideActionPanel;
    REMOVE_ACTION_PANEL: typeof removeExtension;
    INSERT_PANEL: typeof insertPanel;
    INSERT_BUTTON: typeof insertButton;

    UIPATH_INIT: typeof initRobot;
    UIPATH_GET_PROCESSES: typeof getProcesses;

    SEARCH_WINDOW: typeof withSearchWindow;
    DETECT_FRAMEWORKS: typeof withDetectFrameworkVersions;
    RUN_SINGLE_BLOCK: typeof runBlock;
    RUN_READER_BLOCK: typeof runReaderBlock;
    RUN_READER: typeof runReader;
    READ_SELECTED: typeof readSelected;

    CLEAR_DYNAMIC_ELEMENTS: typeof clearDynamicElements;
    UPDATE_DYNAMIC_ELEMENT: typeof updateDynamicElement;
    ENABLE_OVERLAY: typeof enableOverlay;
    DISABLE_OVERLAY: typeof disableOverlay;
    INSTALLED_EXTENSIONS: typeof getInstalledIds;
    CHECK_AVAILABLE: typeof checkAvailable;
    HANDLE_NAVIGATE: typeof handleNavigate;
    SHOW_NOTIFICATION: typeof showNotification;
    LINK_CHILD_TAB: typeof linkChildTab;
    CONTENT_MESSAGE_RUN_BLOCK: typeof runBlockInContentScript;
    CANCEL_SELECT_ELEMENT: typeof cancelSelect;
    SELECT_ELEMENT: typeof selectElement;
  }
}

registerMethods({
  FORM_GET_DEFINITION: getFormDefinition,
  FORM_RESOLVE: resolveForm,
  FORM_CANCEL: cancelForm,

  QUEUE_REACTIVATE_TAB: queueReactivateTab,
  REACTIVATE_TAB: reactivateTab,

  HANDLE_MENU_ACTION: handleMenuAction,
  TOGGLE_ACTION_PANEL: toggleActionPanel,
  SHOW_ACTION_PANEL: showActionPanel,
  HIDE_ACTION_PANEL: hideActionPanel,
  REMOVE_ACTION_PANEL: removeExtension,
  INSERT_PANEL: insertPanel,
  INSERT_BUTTON: insertButton,

  UIPATH_INIT: initRobot,
  UIPATH_GET_PROCESSES: getProcesses,

  SEARCH_WINDOW: withSearchWindow,
  DETECT_FRAMEWORKS: withDetectFrameworkVersions,
  RUN_SINGLE_BLOCK: runBlock,
  RUN_READER_BLOCK: runReaderBlock,
  RUN_READER: runReader,
  READ_SELECTED: readSelected,

  CLEAR_DYNAMIC_ELEMENTS: clearDynamicElements,
  UPDATE_DYNAMIC_ELEMENT: updateDynamicElement,
  ENABLE_OVERLAY: enableOverlay,
  DISABLE_OVERLAY: disableOverlay,
  INSTALLED_EXTENSIONS: getInstalledIds,
  CHECK_AVAILABLE: checkAvailable,
  HANDLE_NAVIGATE: handleNavigate,
  SHOW_NOTIFICATION: showNotification,

  LINK_CHILD_TAB: linkChildTab,
  CONTENT_MESSAGE_RUN_BLOCK: runBlockInContentScript,
  CANCEL_SELECT_ELEMENT: cancelSelect,
  SELECT_ELEMENT: selectElement,
});
