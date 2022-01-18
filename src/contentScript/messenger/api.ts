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

/* Do not use `registerMethod` in this file */
import { getMethod, getNotifier } from "webext-messenger";

export const getFormDefinition = getMethod("FORM_GET_DEFINITION");
export const resolveForm = getMethod("FORM_RESOLVE");
export const cancelForm = getMethod("FORM_CANCEL");
export const queueReactivateTab = getNotifier("QUEUE_REACTIVATE_TAB");
export const reactivateTab = getNotifier("REACTIVATE_TAB");
export const resetTab = getNotifier("RESET_TAB");

export const toggleQuickBar = getMethod("TOGGLE_QUICK_BAR");
export const handleMenuAction = getMethod("HANDLE_MENU_ACTION");
export const toggleActionPanel = getMethod("TOGGLE_ACTION_PANEL");
export const showActionPanel = getMethod("SHOW_ACTION_PANEL");
export const hideActionPanel = getMethod("HIDE_ACTION_PANEL");
export const removeActionPanel = getMethod("REMOVE_ACTION_PANEL");
export const insertPanel = getMethod("INSERT_PANEL");
export const insertButton = getMethod("INSERT_BUTTON");

export const initRobot = getMethod("UIPATH_INIT");
export const getProcesses = getMethod("UIPATH_GET_PROCESSES");
export const searchWindow = getMethod("SEARCH_WINDOW");
export const detectFrameworks = getMethod("DETECT_FRAMEWORKS");

export const runBlock = getMethod("RUN_SINGLE_BLOCK");
export const runReaderBlock = getMethod("RUN_READER_BLOCK");
export const runReader = getMethod("RUN_READER");
export const readSelected = getMethod("READ_SELECTED");

export const clearDynamicElements = getMethod("CLEAR_DYNAMIC_ELEMENTS");
export const updateDynamicElement = getMethod("UPDATE_DYNAMIC_ELEMENT");
export const runExtensionPointReader = getMethod("RUN_EXTENSION_POINT_READER");
export const enableOverlay = getMethod("ENABLE_OVERLAY");
export const disableOverlay = getMethod("DISABLE_OVERLAY");
export const getInstalledExtensionPointIds = getMethod("INSTALLED_EXTENSIONS");
export const checkAvailable = getMethod("CHECK_AVAILABLE");
export const handleNavigate = getNotifier("HANDLE_NAVIGATE");
export const showNotification = getMethod("SHOW_NOTIFICATION");
export const runBrick = getMethod("RUN_BRICK");
export const cancelSelect = getMethod("CANCEL_SELECT_ELEMENT");
export const selectElement = getMethod("SELECT_ELEMENT");

export const runRendererPipeline = getMethod("RUN_RENDERER_PIPELINE");
export const runEffectPipeline = getMethod("RUN_EFFECT_PIPELINE");
export const runMapArgs = getMethod("RUN_MAP_ARGS");
