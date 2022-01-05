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

import browser, { Runtime, WebNavigation } from "webextension-polyfill";
import { registerPort } from "@/background/devtools/protocol";
import { PORT_NAME } from "@/background/devtools/contract";
import {
  installPortListeners,
  navigationEvent,
} from "@/background/devtools/external";
import { runtimeConnect } from "@/chrome";
import { resetTab } from "@/contentScript/messenger/api";
import { thisTab } from "./utils";

const TOP_LEVEL_FRAME_ID = 0;

let _cachedPort: Runtime.Port | null = null;

export async function connectDevtools(): Promise<Runtime.Port> {
  const { tabId } = browser.devtools.inspectedWindow;

  if (_cachedPort) {
    console.debug("Devtools already connected to the background page");
    return _cachedPort;
  }

  console.debug(`Connecting devtools to background page for tab: ${tabId}`);

  // Create a connection to the background page
  let port: Runtime.Port;
  try {
    port = await runtimeConnect(PORT_NAME);
  } catch (error) {
    // Not helpful to use recordError here because it can't connect to the background page to send
    // the error telemetry
    console.error("Devtools cannot connect to the background page", {
      error,
    });
    throw error;
  }

  port.onDisconnect.addListener(() => {
    if (_cachedPort === port) {
      _cachedPort = null;
    }
  });

  installPortListeners(port);
  await registerPort(port);

  _cachedPort = port;
  return port;
}

export function updateDevTools() {
  navigationEvent.emit(browser.devtools.inspectedWindow.tabId);
}

function onNavigation(
  details:
    | WebNavigation.OnHistoryStateUpdatedDetailsType
    | WebNavigation.OnDOMContentLoadedDetailsType
): void {
  if (
    details.frameId === TOP_LEVEL_FRAME_ID &&
    details.tabId === browser.devtools.inspectedWindow.tabId
  ) {
    updateDevTools();
  }
}

function onEditorClose(): void {
  resetTab(thisTab);
}

export function watchNavigation(): void {
  browser.webNavigation.onHistoryStateUpdated.addListener(onNavigation);
  browser.webNavigation.onDOMContentLoaded.addListener(onNavigation);
  window.addEventListener("beforeunload", onEditorClose);

  if (process.env.DEBUG)
    browser.webNavigation.onTabReplaced.addListener(
      ({ replacedTabId, tabId }) => {
        console.warn(
          `The tab ID was updated by the browser from ${replacedTabId} to ${tabId}. Did this cause any issues? https://stackoverflow.com/q/17756258/288906`
        );
      }
    );
}
