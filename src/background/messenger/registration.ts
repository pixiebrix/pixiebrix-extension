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
import { showMySidePanel } from "@/background/sidePanel";
import { waitForContentScript } from "@/background/contentScript";
import initTheme from "@/background/initTheme";
import {
  addTraceEntry,
  addTraceExit,
  clearModComponentTraces,
  clearTraces,
} from "@/telemetry/trace";
import { captureTab } from "@/background/capture";
import {
  deleteCachedAuthData,
  getCachedAuthData,
  hasCachedAuthData,
  removeOAuth2Token,
} from "@/background/auth/authStorage";
import { setToolbarBadge } from "@/background/toolbarBadge";
import { rememberFocus } from "@/utils/focusTracker";
import writeToClipboardInFocusedContext from "@/background/clipboard";
import * as packageRegistry from "@/registry/packageRegistry";
import integrationRegistry from "@/integrations/registry";
import { getUserData } from "@/auth/authStorage";
import {
  clearModComponentDebugLogs,
  clearLog,
  clearLogs,
  recordError,
  recordLog,
} from "@/telemetry/logging";
import { fetchFeatureFlags } from "@/auth/featureFlagStorage";
import {
  integrationConfigLocator,
  refreshIntegrationConfigs,
} from "@/background/integrationConfigLocator";
import { closeTab, focusTab, openTab } from "@/background/tabs";
import launchInteractiveOAuth2Flow from "@/background/auth/launchInteractiveOAuth2Flow";
import { performConfiguredRequest } from "@/background/requests";
import { getAvailableVersion } from "@/background/installer";
import {
  collectPerformanceDiagnostics,
  initTelemetry,
  pong,
  recordEvent,
  sendDeploymentAlert,
} from "@/background/telemetry";
import { ensureContextMenu } from "@/background/contextMenus/ensureContextMenu";
import { uninstallContextMenu } from "@/background/contextMenus/uninstallContextMenu";
import { setCopilotProcessData } from "@/background/partnerHandlers";
import {
  requestRunInAllFrames,
  requestRunInOtherTabs,
  requestRunInOpener,
  requestRunInTarget,
  requestRunInTop,
} from "@/background/executor";
import { preloadContextMenus } from "@/background/contextMenus/preloadContextMenus";
import { removeModComponentForEveryTab } from "@/background/removeModComponentForEveryTab";
import { debouncedActivateStarterMods as installStarterBlueprints } from "@/background/starterMods";
import { launchAuthIntegration } from "@/background/auth/partnerIntegrations/launchAuthIntegration";
import { getPartnerPrincipals } from "@/background/auth/partnerIntegrations/getPartnerPrincipals";
import refreshPartnerAuthentication from "@/background/auth/partnerIntegrations/refreshPartnerAuthentication";

expectContext("background");

declare global {
  interface MessengerMethods {
    SHOW_MY_SIDE_PANEL: typeof showMySidePanel;
    WAIT_FOR_CONTENT_SCRIPT: typeof waitForContentScript;
    ACTIVATE_THEME: typeof initTheme;
    ADD_TRACE_ENTRY: typeof addTraceEntry;
    ADD_TRACE_EXIT: typeof addTraceExit;
    CLEAR_TRACES: typeof clearModComponentTraces;
    CLEAR_ALL_TRACES: typeof clearTraces;
    CAPTURE_TAB: typeof captureTab;
    DELETE_CACHED_AUTH: typeof deleteCachedAuthData;
    GET_CACHED_AUTH: typeof getCachedAuthData;
    HAS_CACHED_AUTH: typeof hasCachedAuthData;
    SET_TOOLBAR_BADGE: typeof setToolbarBadge;
    DOCUMENT_RECEIVED_FOCUS: typeof rememberFocus;
    WRITE_TO_CLIPBOARD_IN_FOCUSED_DOCUMENT: typeof writeToClipboardInFocusedContext;
    REGISTRY_SYNC: typeof packageRegistry.syncPackages;
    REGISTRY_CLEAR: typeof packageRegistry.clear;
    REGISTRY_GET_BY_KINDS: typeof packageRegistry.getByKinds;
    REGISTRY_FIND: typeof packageRegistry.find;
    QUERY_TABS: typeof browser.tabs.query;
    FETCH_FEATURE_FLAGS: typeof fetchFeatureFlags;

    GET_USER_DATA: typeof getUserData;
    RECORD_LOG: typeof recordLog;
    RECORD_ERROR: typeof recordError;
    CLEAR_LOGS: typeof clearLogs;
    CLEAR_LOG: typeof clearLog;
    CLEAR_EXTENSION_DEBUG_LOGS: typeof clearModComponentDebugLogs;

    INTEGRATION_REGISTRY_CLEAR: typeof integrationRegistry.clear;
    LOCATOR_FIND_ALL_SANITIZED_CONFIGS_FOR_INTEGRATION: typeof integrationConfigLocator.findAllSanitizedConfigsForIntegration;
    LOCATOR_FIND_SANITIZED_INTEGRATION_CONFIG: typeof integrationConfigLocator.findSanitizedIntegrationConfig;
    LOCATOR_REFRESH: typeof refreshIntegrationConfigs;
    LOCATOR_REFRESH_LOCAL: typeof integrationConfigLocator.refreshLocal;

    OPEN_TAB: typeof openTab;
    CLOSE_TAB: typeof closeTab;
    FOCUS_TAB: typeof focusTab;

    LAUNCH_INTERACTIVE_OAUTH_FLOW: typeof launchInteractiveOAuth2Flow;

    CONFIGURED_REQUEST: typeof performConfiguredRequest;

    GET_PARTNER_PRINCIPALS: typeof getPartnerPrincipals;
    LAUNCH_AUTH_INTEGRATION: typeof launchAuthIntegration;

    GET_AVAILABLE_VERSION: typeof getAvailableVersion;

    PING: typeof pong;
    COLLECT_PERFORMANCE_DIAGNOSTICS: typeof collectPerformanceDiagnostics;
    RECORD_EVENT: typeof recordEvent;
    INIT_TELEMETRY: typeof initTelemetry;
    SEND_DEPLOYMENT_ALERT: typeof sendDeploymentAlert;

    ENSURE_CONTEXT_MENU: typeof ensureContextMenu;
    UNINSTALL_CONTEXT_MENU: typeof uninstallContextMenu;
    SET_PARTNER_COPILOT_DATA: typeof setCopilotProcessData;

    REQUEST_RUN_IN_OPENER: typeof requestRunInOpener;
    REQUEST_RUN_IN_TARGET: typeof requestRunInTarget;
    REQUEST_RUN_IN_TOP: typeof requestRunInTop;
    REQUEST_RUN_IN_OTHER_TABS: typeof requestRunInOtherTabs;
    REQUEST_RUN_IN_ALL_FRAMES: typeof requestRunInAllFrames;
    PRELOAD_CONTEXT_MENUS: typeof preloadContextMenus;
    REMOVE_MOD_COMPONENT_EVERY_TAB: typeof removeModComponentForEveryTab;
    INSTALL_STARTER_BLUEPRINTS: typeof installStarterBlueprints;

    REFRESH_PARTNER_AUTHENTICATION: typeof refreshPartnerAuthentication;
    REMOVE_OAUTH2_TOKEN: typeof removeOAuth2Token;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    SHOW_MY_SIDE_PANEL: showMySidePanel,
    WAIT_FOR_CONTENT_SCRIPT: waitForContentScript,
    ACTIVATE_THEME: initTheme,
    ADD_TRACE_ENTRY: addTraceEntry,
    ADD_TRACE_EXIT: addTraceExit,
    CLEAR_TRACES: clearModComponentTraces,
    CLEAR_ALL_TRACES: clearTraces,
    CAPTURE_TAB: captureTab,
    DELETE_CACHED_AUTH: deleteCachedAuthData,
    GET_CACHED_AUTH: getCachedAuthData,
    HAS_CACHED_AUTH: hasCachedAuthData,
    SET_TOOLBAR_BADGE: setToolbarBadge,
    DOCUMENT_RECEIVED_FOCUS: rememberFocus,
    WRITE_TO_CLIPBOARD_IN_FOCUSED_DOCUMENT: writeToClipboardInFocusedContext,
    REGISTRY_SYNC: packageRegistry.syncPackages,
    REGISTRY_CLEAR: packageRegistry.clear,
    REGISTRY_GET_BY_KINDS: packageRegistry.getByKinds,
    REGISTRY_FIND: packageRegistry.find,
    QUERY_TABS: browser.tabs.query,
    FETCH_FEATURE_FLAGS: fetchFeatureFlags,

    GET_USER_DATA: getUserData,
    RECORD_LOG: recordLog,
    RECORD_ERROR: recordError,
    CLEAR_LOGS: clearLogs,
    CLEAR_LOG: clearLog,
    CLEAR_EXTENSION_DEBUG_LOGS: clearModComponentDebugLogs,

    INTEGRATION_REGISTRY_CLEAR:
      integrationRegistry.clear.bind(integrationRegistry),
    LOCATOR_FIND_ALL_SANITIZED_CONFIGS_FOR_INTEGRATION:
      integrationConfigLocator.findAllSanitizedConfigsForIntegration.bind(
        integrationConfigLocator,
      ),
    LOCATOR_FIND_SANITIZED_INTEGRATION_CONFIG:
      integrationConfigLocator.findSanitizedIntegrationConfig.bind(
        integrationConfigLocator,
      ),
    LOCATOR_REFRESH_LOCAL: integrationConfigLocator.refreshLocal.bind(
      integrationConfigLocator,
    ),
    LOCATOR_REFRESH: refreshIntegrationConfigs,

    OPEN_TAB: openTab,
    CLOSE_TAB: closeTab,
    FOCUS_TAB: focusTab,

    LAUNCH_INTERACTIVE_OAUTH_FLOW: launchInteractiveOAuth2Flow,

    CONFIGURED_REQUEST: performConfiguredRequest,

    GET_PARTNER_PRINCIPALS: getPartnerPrincipals,
    LAUNCH_AUTH_INTEGRATION: launchAuthIntegration,

    GET_AVAILABLE_VERSION: getAvailableVersion,

    PING: pong,
    COLLECT_PERFORMANCE_DIAGNOSTICS: collectPerformanceDiagnostics,
    RECORD_EVENT: recordEvent,
    INIT_TELEMETRY: initTelemetry,
    SEND_DEPLOYMENT_ALERT: sendDeploymentAlert,

    ENSURE_CONTEXT_MENU: ensureContextMenu,
    UNINSTALL_CONTEXT_MENU: uninstallContextMenu,
    SET_PARTNER_COPILOT_DATA: setCopilotProcessData,

    REQUEST_RUN_IN_OPENER: requestRunInOpener,
    REQUEST_RUN_IN_TARGET: requestRunInTarget,
    REQUEST_RUN_IN_TOP: requestRunInTop,
    REQUEST_RUN_IN_OTHER_TABS: requestRunInOtherTabs,
    REQUEST_RUN_IN_ALL_FRAMES: requestRunInAllFrames,
    PRELOAD_CONTEXT_MENUS: preloadContextMenus,
    REMOVE_MOD_COMPONENT_EVERY_TAB: removeModComponentForEveryTab,
    INSTALL_STARTER_BLUEPRINTS: installStarterBlueprints,

    REFRESH_PARTNER_AUTHENTICATION: refreshPartnerAuthentication,
    REMOVE_OAUTH2_TOKEN: removeOAuth2Token,
  });
}
