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

// Required -- Service Workers don't have XMLHttpRequest
import "@/background/axiosFetch";

import { initMessengerLogging } from "@/development/messengerLogging";
import registerMessenger from "@/background/messenger/registration";
import registerExternalMessenger from "@/background/messenger/external/registration";
import initLocator from "@/background/integrationConfigLocator";
import initContextMenus from "@/background/contextMenus/initContextMenus";
import initBrowserAction from "@/background/browserAction";
import initInstaller from "@/background/installer";
import initNavigation from "@/background/navigation";
import initExecutor from "@/background/executor";
import initBrowserCommands from "@/background/initBrowserCommands";
import initDeploymentUpdater from "@/background/deploymentUpdater";
import initTheme from "@/background/initTheme";
import initWelcomeMods from "@/background/welcomeMods";
import { initLogSweep } from "@/telemetry/logging";
import { initModUpdater } from "@/background/modUpdater";
import { initRuntimeLogging } from "@/development/runtimeLogging";
import initWalkthroughModalTrigger from "@/background/walkthroughModalTrigger";
import { initSidePanel } from "./sidePanel";
import initRestrictUnauthenticatedUrlAccess from "@/background/restrictUnauthenticatedUrlAccess";
import { setPlatform } from "@/platform/platformContext";
import backgroundPlatform from "@/background/backgroundPlatform";
import { initFeatureFlagBackgroundListeners } from "@/auth/featureFlagStorage";
import initTabListener from "./tabs";
import { initApiClient } from "@/data/service/apiClient";
import initTeamTrialUpdater from "@/background/teamTrialUpdater";
import { initStateControllerListeners } from "@/background/stateControllerListeners";
import { ensureOffscreenDocument } from "@/tinyPages/offscreenDocumentController";

// The background "platform" currently is used to execute API requests from Google Sheets/Automation Anywhere.
// In the future, it might also run other background tasks from mods (e.g., background intervals)
setPlatform(backgroundPlatform);

// Allows the content script to directly access the session storage for mod variables. Without this, we'd need to
// we'd need to use the messenger or localStorage to synchronize state across frames.
// Does not trigger a permissions prompt, see:
// https://developer.chrome.com/docs/extensions/reference/api/storage#type-AccessLevel
void chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
});

void initLocator();
void initMessengerLogging();
void initRuntimeLogging();
registerMessenger();
registerExternalMessenger();
void initBrowserAction();
void initSidePanel();
initInstaller();
void initNavigation();
initExecutor();
initTabListener();
initFeatureFlagBackgroundListeners();
initContextMenus();
initBrowserCommands();
initDeploymentUpdater();
initTeamTrialUpdater();
initTheme();
initWelcomeMods();
initApiClient();
initLogSweep();
initModUpdater();
initWalkthroughModalTrigger();
void initRestrictUnauthenticatedUrlAccess();
initStateControllerListeners();
void ensureOffscreenDocument();
