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

/* Do not use `registerMethod` in this file */
import { getMethod, getNotifier } from "webext-messenger";
import { forEachTab } from "@/utils/extensionUtils";

export const queueReactivateTab = getNotifier("QUEUE_REACTIVATE_TAB");

/**
 * Reactivate mods in a single tab.
 * @see reactivateEveryTab
 */
export const reactivateTab = getNotifier("REACTIVATE_TAB");

/**
 * Convenience method to reactivate mods in every/all tabs.
 * @see reactivateTab
 */
export function reactivateEveryTab(): void {
  console.debug("Reactivate all tabs");
  void forEachTab(reactivateTab);
}

export const ensureExtensionPointsInstalled = getMethod(
  "ENSURE_EXTENSION_POINTS_INSTALLED",
);
export const removeInstalledExtension = getNotifier(
  "REMOVE_INSTALLED_EXTENSION",
);
export const resetTab = getNotifier("RESET_TAB");
export const toggleQuickBar = getMethod("TOGGLE_QUICK_BAR");

export const insertPanel = getMethod("INSERT_PANEL");
export const insertButton = getMethod("INSERT_BUTTON");
export const getAttributeExamples = getMethod("GET_ATTRIBUTE_EXAMPLES");

export const runBlock = getMethod("RUN_SINGLE_BLOCK");
export const runRendererBlock = getMethod("RUN_RENDERER_BLOCK");

export const clearDynamicElements = getNotifier("CLEAR_DYNAMIC_ELEMENTS");
export const updateDynamicElement = getNotifier("UPDATE_DYNAMIC_ELEMENT");
export const runExtensionPointReader = getMethod("RUN_EXTENSION_POINT_READER");
export const enableOverlay = getMethod("ENABLE_OVERLAY");
export const disableOverlay = getMethod("DISABLE_OVERLAY");
export const getInstalledExtensionPoints = getMethod(
  "INSTALLED_EXTENSION_POINTS",
);
export const checkAvailable = getMethod("CHECK_AVAILABLE");
export const runBrick = getMethod("RUN_BRICK");
export const cancelSelect = getMethod("CANCEL_SELECT_ELEMENT");
export const selectElement = getMethod("SELECT_ELEMENT");

export const runRendererPipeline = getMethod("RUN_RENDERER_PIPELINE");
export const runHeadlessPipeline = getMethod("RUN_HEADLESS_PIPELINE");
export const runMapArgs = getMethod("RUN_MAP_ARGS");

export const getCopilotHostData = getMethod("GET_COPILOT_HOST_DATA");

export const reloadMarketplaceEnhancements = getMethod(
  "RELOAD_MARKETPLACE_ENHANCEMENTS",
);

export const showLoginBanner = getMethod("SHOW_LOGIN_BANNER");
