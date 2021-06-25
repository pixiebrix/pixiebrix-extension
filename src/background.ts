/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// extensionContext needs to be imported before webpack-target-webextension to
// ensure the webpack path is correct
import "@/extensionContext";

// init rollbar early so we get error reporting on the other initialization
import "@/telemetry/rollbar";

import "webpack-target-webextension/lib/background";
import "webext-dynamic-content-scripts";

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

import initGoogle from "@/contrib/google/background";
import initFrames from "@/background/iframes";
import initNavigation from "@/background/navigation";
import initExecutor from "@/background/executor";
import preload from "@/background/preload";
import initDeploymentUpdater from "@/background/deployment";
import { isChrome } from "@/helpers";

initNavigation();
initExecutor();
initGoogle();
initFrames();
preload();
initDeploymentUpdater();

if (isChrome) {
  const script = document.createElement("script");
  script.src = "https://apis.google.com/js/client.js?onload=onGAPILoad";
  document.head.append(script);
}

// `web-ext run` reloads the extension without reloading the manifest.
// This forces a full reload if the version hasn't changed since the last run.
if (process.env.ENVIRONMENT === "development") {
  const { version_name } = chrome.runtime.getManifest();

  if (localStorage.getItem("dev:last-version") === version_name) {
    localStorage.removeItem("dev:last-version");
    chrome.runtime.reload();
  }

  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "update") {
      localStorage.setItem("dev:last-version", version_name);
    }
  });
}
