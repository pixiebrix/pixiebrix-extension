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

// eslint-disable-next-line import/no-unassigned-import -- Automatic registration
import "webext-inject-on-install";
import "@/extensionContext";
import "@/development/errorsBadge";
// eslint-disable-next-line import/no-unassigned-import -- Automatic registration
import "@/background/backgroundDomWatcher";

// Required for MV3; Service Workers don't have XMLHttpRequest
import "@/background/axiosFetch";

import { initMessengerLogging } from "@/development/messengerLogging";
import registerMessenger from "@/background/messenger/registration";
import registerMessengerStrict from "@/background/messenger/strict/registration";
import registerExternalMessenger from "@/background/messenger/external/registration";
import initLocator from "@/background/locator";
import initContextMenus from "@/background/contextMenus";
import initBrowserAction from "@/background/browserAction";
import initInstaller from "@/background/installer";
import initNavigation from "@/background/navigation";
import initExecutor from "@/background/executor";
import initBrowserCommands from "@/background/initBrowserCommands";
import initDeploymentUpdater from "@/background/deploymentUpdater";
import initTheme from "@/background/initTheme";
import initStarterMods from "@/background/starterMods";
import { initPartnerTokenRefresh } from "@/background/partnerIntegrations";
import { initContentScriptReadyListener } from "@/background/contentScript";
import { initLogSweep } from "@/telemetry/logging";
import { initModUpdater } from "@/background/modUpdater";
import { initRuntimeLogging } from "@/development/runtimeLogging";
import initWalkthroughModalTrigger from "@/background/walkthroughModalTrigger";
import { initSidePanel } from "./sidePanel";
import initRestrictUnauthenticatedUrlAccess from "@/background/restrictUnauthenticatedUrlAccess";
import {
  initManagedStorage,
  watchDelayedStorageInitialization,
} from "@/store/enterprise/managedStorage";
import activateBrowserActionIcon from "./activateBrowserActionIcon";
import { setPlatform } from "@/platform/platformContext";
import backgroundPlatform from "@/background/backgroundPlatform";

// The background "platform" currently is used to execute API requests from Google Sheets/Automation Anywhere.
// In the future, it might also run other background tasks from mods (e.g., background intervals)
setPlatform(backgroundPlatform);

// Try to initialize managed storage as early as possible because it impacts background behavior
// Call watchDelayedStorageInitialization to handle case where storage is not immediately available within timeout.
// We might consider putting watchStorageInitialization in initManagedStorage, but having a non-terminating
// interval complicates testing.
void initManagedStorage().then(async () => watchDelayedStorageInitialization());

void initLocator();
void initMessengerLogging();
void initRuntimeLogging();
registerMessenger();
registerMessengerStrict();
registerExternalMessenger();
void initBrowserAction();
void initSidePanel();
initInstaller();
void initNavigation();
initExecutor();
initContextMenus();
initContentScriptReadyListener();
initBrowserCommands();
initDeploymentUpdater();
void activateBrowserActionIcon(); // Keep here #7645
initTheme();
initStarterMods();
initPartnerTokenRefresh();
initLogSweep();
initModUpdater();
initWalkthroughModalTrigger();
void initRestrictUnauthenticatedUrlAccess();
