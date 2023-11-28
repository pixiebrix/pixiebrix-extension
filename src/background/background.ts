/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

// extensionContext needs to be imported before webpack-target-webextension to
// ensure the webpack path is correct
// eslint-disable-next-line import/no-unassigned-import -- Automatic registration
import "webext-inject-on-install";
import "@/extensionContext";
import "@/development/autoreload";
import "@/development/errorsBadge";

// Required for MV3; Service Workers don't have XMLHttpRequest
import "@/background/axiosFetch";

import { initMessengerLogging } from "@/development/messengerLogging";
import registerMessenger from "@/background/messenger/registration";
import registerExternalMessenger from "@/background/messenger/external/registration";
import initLocator from "@/background/locator";
import initContextMenus from "@/background/contextMenus";
import initBrowserAction from "@/background/browserAction";
import initInstaller from "@/background/installer";
import initNavigation from "@/background/navigation";
import initExecutor from "@/background/executor";
import initBrowserCommands from "@/background/initBrowserCommands";
import initDeploymentUpdater from "@/background/deploymentUpdater";
import initFirefoxCompat from "@/background/firefoxCompat";
import activateBrowserActionIcon from "@/background/activateBrowserActionIcon";
import initPartnerTheme from "@/background/partnerTheme";
import initStarterMods from "@/background/starterMods";
import { initPartnerTokenRefresh } from "@/background/partnerIntegrations";
import { initContentScriptReadyListener } from "@/background/contentScript";
import { initLogSweep } from "@/telemetry/logging";
import { initModUpdater } from "@/background/modUpdater";
import { initRuntimeLogging } from "@/development/runtimeLogging";

void initLocator();
void initMessengerLogging();
void initRuntimeLogging();
registerMessenger();
registerExternalMessenger();
initBrowserAction();
initInstaller();
initNavigation();
initExecutor();
initContextMenus();
initContentScriptReadyListener();
initBrowserCommands();
initDeploymentUpdater();
initFirefoxCompat();
activateBrowserActionIcon();
initPartnerTheme();
initStarterMods();
initPartnerTokenRefresh();
initLogSweep();
initModUpdater();
