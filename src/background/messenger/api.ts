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
import type { AxiosRequestConfig } from "axios";
import type { RemoteResponse } from "@/types/contract";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";

export const getAvailableVersion = getMethod("GET_AVAILABLE_VERSION", bg);
export const getPartnerPrincipals = getMethod("GET_PARTNER_PRINCIPALS", bg);
export const launchAuthIntegration = getMethod("LAUNCH_AUTH_INTEGRATION", bg);
export const setPartnerCopilotData = getNotifier(
  "SET_PARTNER_COPILOT_DATA",
  bg,
);

export const activateTab = getMethod("ACTIVATE_TAB", bg);
export const reactivateEveryTab = getNotifier("REACTIVATE_EVERY_TAB", bg);
export const removeExtensionForEveryTab = getNotifier(
  "REMOVE_EXTENSION_EVERY_TAB",
  bg,
);

export const closeTab = getMethod("CLOSE_TAB", bg);
export const clearServiceCache = getMethod("CLEAR_SERVICE_CACHE", bg);

/**
 * Uninstall context menu and return whether the context menu was uninstalled.
 */
export const uninstallContextMenu = getMethod("UNINSTALL_CONTEXT_MENU", bg);
export const ensureContextMenu = getMethod("ENSURE_CONTEXT_MENU", bg);
export const openTab = getMethod("OPEN_TAB", bg);

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

// `getMethod` currently strips generics, so we must copy the function signature here
export const performConfiguredRequestInBackground = getMethod(
  "CONFIGURED_REQUEST",
  bg,
) as <TData>(
  integrationConfig: SanitizedIntegrationConfig | null,
  requestConfig: AxiosRequestConfig,
) => Promise<RemoteResponse<TData>>;

// Use this instead: `import reportError from "@/telemetry/reportError"`
// export const recordError = getNotifier("RECORD_ERROR", bg);

export const initTelemetry = getNotifier("INIT_TELEMETRY", bg);
export const sendDeploymentAlert = getNotifier("SEND_DEPLOYMENT_ALERT", bg);

export const getUserData = getMethod("GET_USER_DATA", bg);

export const installStarterBlueprints = getMethod(
  "INSTALL_STARTER_BLUEPRINTS",
  bg,
);

export const ping = getMethod("PING", bg);

export const collectPerformanceDiagnostics = getMethod(
  "COLLECT_PERFORMANCE_DIAGNOSTICS",
  bg,
);
