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
import {
  backgroundTarget as bg,
  getMethod,
  getNotifier,
} from "webext-messenger";
import type { NetworkRequestConfig } from "@/types/networkTypes";
import type { RemoteResponse } from "@/types/contract";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type Nullishable } from "@/utils/nullishUtils";

export const getAvailableVersion = getMethod("GET_AVAILABLE_VERSION", bg);

export const showMySidePanel = getMethod("SHOW_MY_SIDE_PANEL", bg);
export const waitForContentScript = getMethod("WAIT_FOR_CONTENT_SCRIPT", bg);

export const activateTheme = getMethod("ACTIVATE_THEME", bg);

export const traces = {
  addEntry: getNotifier("ADD_TRACE_ENTRY", bg),
  addExit: getNotifier("ADD_TRACE_EXIT", bg),
  clear: getMethod("CLEAR_TRACES", bg),
  clearAll: getNotifier("CLEAR_ALL_TRACES", bg),
};

export const captureTab = getMethod("CAPTURE_TAB", bg);
export const deleteCachedAuthData = getMethod("DELETE_CACHED_AUTH", bg);
export const getCachedAuthData = getMethod("GET_CACHED_AUTH", bg);

export const hasCachedAuthData = getMethod("HAS_CACHED_AUTH", bg);

export const setToolbarBadge = getMethod("SET_TOOLBAR_BADGE", bg);
export const documentReceivedFocus = getNotifier("DOCUMENT_RECEIVED_FOCUS", bg);

export const writeToClipboardInFocusedDocument = getMethod(
  "WRITE_TO_CLIPBOARD_IN_FOCUSED_DOCUMENT",
  bg,
);

export const registry = {
  syncRemote: getMethod("REGISTRY_SYNC", bg),
  getByKinds: getMethod("REGISTRY_GET_BY_KINDS", bg),
  find: getMethod("REGISTRY_FIND", bg),
  clear: getMethod("REGISTRY_CLEAR", bg),
};

export const queryTabs = getMethod("QUERY_TABS", bg);

// Use this instead: `import reportEvent from "@/telemetry/reportEvent"`
// export const recordEvent = getNotifier("RECORD_EVENT", bg);

export const recordLog = getNotifier("RECORD_LOG", bg);
export const clearLogs = getMethod("CLEAR_LOGS", bg);
export const clearLog = getMethod("CLEAR_LOG", bg);
export const clearExtensionDebugLogs = getMethod(
  "CLEAR_MOD_COMPONENT_DEBUG_LOGS",
  bg,
);

export const fetchFeatureFlagsInBackground = getMethod(
  "FETCH_FEATURE_FLAGS",
  bg,
);

export const integrationConfigLocator = {
  findAllSanitizedConfigsForIntegration: getMethod(
    "LOCATOR_FIND_ALL_SANITIZED_CONFIGS_FOR_INTEGRATION",
    bg,
  ),
  findSanitizedIntegrationConfig: getMethod(
    "LOCATOR_FIND_SANITIZED_INTEGRATION_CONFIG",
    bg,
  ),
  refresh: getMethod("LOCATOR_REFRESH", bg),
  refreshLocal: getMethod("LOCATOR_REFRESH_LOCAL", bg),
};

export const openTab = getMethod("OPEN_TAB", bg);
export const closeTab = getMethod("CLOSE_TAB", bg);
export const focusTab = getMethod("FOCUS_TAB", bg);

export const launchInteractiveOAuthFlow = getMethod(
  "LAUNCH_INTERACTIVE_OAUTH_FLOW",
  bg,
);

// `getMethod` currently strips generics, so we must copy the function signature here
export const performConfiguredRequestInBackground = getMethod(
  "CONFIGURED_REQUEST",
  bg,
) as <TData>(
  integrationConfig: Nullishable<SanitizedIntegrationConfig>,
  requestConfig: NetworkRequestConfig,
  options: { interactiveLogin: boolean },
) => Promise<RemoteResponse<TData>>;

export const getPartnerPrincipals = getMethod("GET_PARTNER_PRINCIPALS", bg);
export const launchAuthIntegration = getMethod("LAUNCH_AUTH_INTEGRATION", bg);

export const ping = getMethod("PING", bg);
export const collectPerformanceDiagnostics = getMethod(
  "COLLECT_PERFORMANCE_DIAGNOSTICS",
  bg,
);

// Use this instead: `import reportError from "@/telemetry/reportError"`
// export const recordError = getNotifier("RECORD_ERROR", bg);

export const initTelemetry = getNotifier("INIT_TELEMETRY", bg);
export const sendDeploymentAlert = getNotifier("SEND_DEPLOYMENT_ALERT", bg);

export const ensureContextMenu = getMethod("ENSURE_CONTEXT_MENU", bg);
/**
 * Uninstall context menu and return whether the context menu was uninstalled.
 */
export const uninstallContextMenu = getMethod("UNINSTALL_CONTEXT_MENU", bg);

export const setPartnerCopilotData = getNotifier(
  "SET_PARTNER_COPILOT_DATA",
  bg,
);

export const requestRun = {
  inOpener: getMethod("REQUEST_RUN_IN_OPENER", bg),
  inTarget: getMethod("REQUEST_RUN_IN_TARGET", bg),
  inTop: getMethod("REQUEST_RUN_IN_TOP", bg),
  inOtherTabs: getMethod("REQUEST_RUN_IN_OTHER_TABS", bg),
  inAllFrames: getMethod("REQUEST_RUN_IN_ALL_FRAMES", bg),
};

export const contextMenus = {
  preload: getMethod("PRELOAD_CONTEXT_MENUS", bg),
};

export const removeModComponentForEveryTab = getNotifier(
  "REMOVE_MOD_COMPONENT_EVERY_TAB",
  bg,
);
export const clearIntegrationRegistry = getMethod(
  "INTEGRATION_REGISTRY_CLEAR",
  bg,
);
export const getUserData = getMethod("GET_USER_DATA", bg);
export const installStarterBlueprints = getMethod(
  "INSTALL_STARTER_BLUEPRINTS",
  bg,
);

export const refreshPartnerAuthentication = getMethod(
  "REFRESH_PARTNER_AUTHENTICATION",
  bg,
);
export const removeOAuth2Token = getMethod("REMOVE_OAUTH2_TOKEN", bg);

export const tabCapture = {
  startAudioCapture: getMethod("AUDIO_CAPTURE_START", bg),
  stopAudioCapture: getMethod("AUDIO_CAPTURE_STOP", bg),
  forwardAudioCaptureEvent: getNotifier("AUDIO_CAPTURE_EVENT", bg),
};
