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

// extensionContext needs to be imported before webpack-target-webextension to
// ensure the webpack path is correct
import "@/extensionContext";

// Init rollbar early so we get error reporting on the other initialization
import "@/telemetry/rollbar";

import "webpack-target-webextension/lib/background";
import "webext-dynamic-content-scripts";

import "./development/autoreload";
import "./background/installer";
import "./messaging/external";
import "./background/requests";
import "./background/locator";
import "./background/logging";
import "./background/auth";
import "./background/contextMenus";
import "./background/dataStore";
import "./background/devtools";
import "./background/browserAction";
import "./background/permissionPrompt";

import initGoogle from "@/contrib/google/initGoogle";
import initFrames from "@/background/iframes";
import initNavigation from "@/background/navigation";
import initExecutor from "@/background/executor";
import preload from "@/background/preload";
import initDeploymentUpdater from "@/background/deployment";
import initFirefoxCompat from "@/background/firefoxCompat";

console.log("hello!!!");
initNavigation();
initExecutor();
initGoogle();
initFrames();
preload();
initDeploymentUpdater();
void initFirefoxCompat();
