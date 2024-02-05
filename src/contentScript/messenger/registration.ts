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
import {
  ensureInstalled,
  getActiveExtensionPoints,
  queueReactivateTab,
  reactivateTab,
  removePersistedExtension,
} from "@/contentScript/lifecycle";
import { resolveForm } from "@/contentScript/ephemeralFormProtocol";
import { getReservedPanelEntries } from "@/contentScript/sidebarController";
import { insertPanel } from "@/contentScript/pageEditor/insertPanel";
import { insertButton } from "@/contentScript/pageEditor/insertButton";
import {
  clearDynamicElements,
  disableOverlay,
  enableOverlay,
  runExtensionPointReader,
  updateDynamicElement,
} from "@/contentScript/pageEditor/dynamic";
import {
  runBlockPreview,
  resetTab,
  runRendererBlock,
  navigateTab,
} from "@/contentScript/pageEditor";
import { runBrick } from "@/contentScript/executor";
import {
  cancelSelect,
  selectElement,
} from "@/contentScript/pageEditor/elementPicker";
import {
  runHeadlessPipeline,
  runMapArgs,
  runRendererPipeline,
} from "@/contentScript/pipelineProtocol";
import { toggleQuickBar } from "@/components/quickBar/QuickBarApp";
import { reloadActivationEnhancements } from "@/contentScript/loadActivationEnhancementsCore";
import { getAttributeExamples } from "@/contentScript/pageEditor/elementInformation";
import { getCopilotHostData } from "@/contrib/automationanywhere/SetCopilotDataEffect";

expectContext("contentScript");

declare global {
  interface MessengerMethods {
    FORM_RESOLVE: typeof resolveForm;

    QUEUE_REACTIVATE_TAB: typeof queueReactivateTab;
    REACTIVATE_TAB: typeof reactivateTab;
    REMOVE_INSTALLED_EXTENSION: typeof removePersistedExtension;
    RESET_TAB: typeof resetTab;
    NAVIGATE_TAB: typeof navigateTab;

    TOGGLE_QUICK_BAR: typeof toggleQuickBar;

    INSERT_PANEL: typeof insertPanel;
    INSERT_BUTTON: typeof insertButton;

    GET_ATTRIBUTE_EXAMPLES: typeof getAttributeExamples;
    RUN_SINGLE_BLOCK: typeof runBlockPreview;
    RUN_RENDERER_BLOCK: typeof runRendererBlock;

    CLEAR_DYNAMIC_ELEMENTS: typeof clearDynamicElements;
    UPDATE_DYNAMIC_ELEMENT: typeof updateDynamicElement;
    RUN_EXTENSION_POINT_READER: typeof runExtensionPointReader;
    ENABLE_OVERLAY: typeof enableOverlay;
    DISABLE_OVERLAY: typeof disableOverlay;
    INSTALLED_EXTENSION_POINTS: typeof getActiveExtensionPoints;
    ENSURE_EXTENSION_POINTS_INSTALLED: typeof ensureInstalled;

    RUN_BRICK: typeof runBrick;
    CANCEL_SELECT_ELEMENT: typeof cancelSelect;
    SELECT_ELEMENT: typeof selectElement;

    RUN_RENDERER_PIPELINE: typeof runRendererPipeline;
    RUN_HEADLESS_PIPELINE: typeof runHeadlessPipeline;
    RUN_MAP_ARGS: typeof runMapArgs;

    GET_COPILOT_HOST_DATA: typeof getCopilotHostData;

    RELOAD_MARKETPLACE_ENHANCEMENTS: typeof reloadActivationEnhancements;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    FORM_RESOLVE: resolveForm,

    QUEUE_REACTIVATE_TAB: queueReactivateTab,
    REACTIVATE_TAB: reactivateTab,
    REMOVE_INSTALLED_EXTENSION: removePersistedExtension,
    RESET_TAB: resetTab,
    NAVIGATE_TAB: navigateTab,

    TOGGLE_QUICK_BAR: toggleQuickBar,

    INSERT_PANEL: insertPanel,
    INSERT_BUTTON: insertButton,

    GET_ATTRIBUTE_EXAMPLES: getAttributeExamples,
    RUN_SINGLE_BLOCK: runBlockPreview,
    RUN_RENDERER_BLOCK: runRendererBlock,

    CLEAR_DYNAMIC_ELEMENTS: clearDynamicElements,
    UPDATE_DYNAMIC_ELEMENT: updateDynamicElement,
    RUN_EXTENSION_POINT_READER: runExtensionPointReader,
    ENABLE_OVERLAY: enableOverlay,
    DISABLE_OVERLAY: disableOverlay,
    INSTALLED_EXTENSION_POINTS: getActiveExtensionPoints,
    ENSURE_EXTENSION_POINTS_INSTALLED: ensureInstalled,

    RUN_BRICK: runBrick,
    CANCEL_SELECT_ELEMENT: cancelSelect,
    SELECT_ELEMENT: selectElement,

    RUN_RENDERER_PIPELINE: runRendererPipeline,
    RUN_HEADLESS_PIPELINE: runHeadlessPipeline,
    RUN_MAP_ARGS: runMapArgs,

    GET_COPILOT_HOST_DATA: getCopilotHostData,

    RELOAD_MARKETPLACE_ENHANCEMENTS: reloadActivationEnhancements,
  });
}
