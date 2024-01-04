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

// Keep in order so precedence is preserved
import "@/vendors/theme/app/app.scss";
import "@/vendors/overrides.scss";
import "@/utils/layout.scss";
import "./sidebar.scss";

import "@/extensionContext";

import { initMessengerLogging } from "@/development/messengerLogging";
import registerMessenger from "@/sidebar/messenger/registration";
import App from "@/sidebar/SidebarApp";
import ReactDOM from "react-dom";
import React from "react";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import { initToaster } from "@/utils/notify";
import { initRuntimeLogging } from "@/development/runtimeLogging";
import { initCopilotMessenger } from "@/contrib/automationanywhere/aaFrameProtocol";
import { initPerformanceMonitoring } from "@/telemetry/performance";
import { isMV3 } from "@/mv3/api";
import {
  type SidebarStatusMessage,
  SIDEPANEL_PORT_NAME,
} from "@/types/sidebarControllerTypes";

function init(): void {
  ReactDOM.render(<App />, document.querySelector("#container"));
}

void initMessengerLogging();
void initRuntimeLogging();
void initPerformanceMonitoring();
registerMessenger();
registerContribBlocks();
registerBuiltinBricks();
initToaster();
init();

// Handle an embedded AA business copilot frame
void initCopilotMessenger();

// Device to let background page know if sidepanel is open: https://stackoverflow.com/a/77106777/402560
if (isMV3()) {
  const tabId = Number.parseInt(
    new URLSearchParams(location.search).get("tabId"),
    10,
  );

  // Background and content scripts communicate on different ports
  // https://developer.chrome.com/docs/extensions/develop/concepts/messaging
  let backgroundPort = chrome.runtime.connect({ name: SIDEPANEL_PORT_NAME });
  let tabPort = chrome.tabs.connect(tabId, { name: SIDEPANEL_PORT_NAME });

  const sendStatusMessage = (port: chrome.runtime.Port) => {
    port.postMessage({
      type: "status",
      payload: {
        tabId,
        hidden: document.hidden,
      },
    } satisfies SidebarStatusMessage);
  };

  backgroundPort.onDisconnect.addListener(() => {
    // Reconnect if service worker is recycled despite keep-alive
    backgroundPort = chrome.runtime.connect({ name: SIDEPANEL_PORT_NAME });
  });

  tabPort.onDisconnect.addListener(() => {
    // Reconnect if the tab does a full navigation (i.e., the content script is reloaded)
    tabPort = chrome.tabs.connect(tabId, { name: SIDEPANEL_PORT_NAME });
  });

  document.addEventListener("visibilitychange", () => {
    sendStatusMessage(backgroundPort);
    sendStatusMessage(tabPort);
  });

  // XXX: Keep the background worker alive. Is keep alive necessary given the reconnection logic above?
  setInterval(
    () => {
      sendStatusMessage(backgroundPort);
    },
    15 * 60 * 1000,
  );
}
