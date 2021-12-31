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
} from "@/contentScript/ephemeralFormProtocol";
import {
  hideActionPanel,
  showActionPanel,
  toggleActionPanel,
  removeExtension,
} from "@/actionPanel/native";
import { insertPanel } from "@/nativeEditor/insertPanel";
import { insertButton } from "@/nativeEditor/insertButton";
import {
  clearDynamicElements,
  disableOverlay,
  enableOverlay,
  runExtensionPointReader,
  updateDynamicElement,
} from "@/nativeEditor/dynamic";
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
import { linkChildTab, runBrick } from "@/contentScript/executor";
import { cancelSelect, selectElement } from "@/nativeEditor/selector";
import {
  runEffectPipeline,
  runMapArgs,
  runRendererPipeline,
} from "@/contentScript/pipelineProtocol";
import { toggleQuickBar } from "@/components/quickBar/QuickBarApp";

expectContext("contentScript");

declare global {
  interface MessengerMethods {
    FORM_GET_DEFINITION: typeof getFormDefinition;
    FORM_RESOLVE: typeof resolveForm;
    FORM_CANCEL: typeof cancelForm;

    QUEUE_REACTIVATE_TAB: typeof queueReactivateTab;
    REACTIVATE_TAB: typeof reactivateTab;

    TOGGLE_QUICK_BAR: typeof toggleQuickBar;
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
    RUN_EXTENSION_POINT_READER: typeof runExtensionPointReader;
    ENABLE_OVERLAY: typeof enableOverlay;
    DISABLE_OVERLAY: typeof disableOverlay;
    INSTALLED_EXTENSIONS: typeof getInstalledIds;
    CHECK_AVAILABLE: typeof checkAvailable;
    HANDLE_NAVIGATE: typeof handleNavigate;
    SHOW_NOTIFICATION: typeof showNotification;
    LINK_CHILD_TAB: typeof linkChildTab;
    RUN_BRICK: typeof runBrick;
    CANCEL_SELECT_ELEMENT: typeof cancelSelect;
    SELECT_ELEMENT: typeof selectElement;

    RUN_RENDERER_PIPELINE: typeof runRendererPipeline;
    RUN_EFFECT_PIPELINE: typeof runEffectPipeline;
    RUN_MAP_ARGS: typeof runMapArgs;
  }
}

registerMethods({
  FORM_GET_DEFINITION: getFormDefinition,
  FORM_RESOLVE: resolveForm,
  FORM_CANCEL: cancelForm,

  QUEUE_REACTIVATE_TAB: queueReactivateTab,
  REACTIVATE_TAB: reactivateTab,

  TOGGLE_QUICK_BAR: toggleQuickBar,
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
  RUN_EXTENSION_POINT_READER: runExtensionPointReader,
  ENABLE_OVERLAY: enableOverlay,
  DISABLE_OVERLAY: disableOverlay,
  INSTALLED_EXTENSIONS: getInstalledIds,
  CHECK_AVAILABLE: checkAvailable,
  HANDLE_NAVIGATE: handleNavigate,
  SHOW_NOTIFICATION: showNotification,

  LINK_CHILD_TAB: linkChildTab,
  RUN_BRICK: runBrick,
  CANCEL_SELECT_ELEMENT: cancelSelect,
  SELECT_ELEMENT: selectElement,

  RUN_RENDERER_PIPELINE: runRendererPipeline,
  RUN_EFFECT_PIPELINE: runEffectPipeline,
  RUN_MAP_ARGS: runMapArgs,
});
