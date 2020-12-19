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

import { v4 as uuidv4 } from "uuid";

const PIXIEBRIX_SYMBOL = Symbol.for("pixiebrix-content-script");

declare global {
  interface Window {
    [PIXIEBRIX_SYMBOL]?: string;
  }
}

if (!window[PIXIEBRIX_SYMBOL]) {
  window[PIXIEBRIX_SYMBOL] = uuidv4();
} else {
  throw Error(
    `PixieBrix contentScript already installed: ${window[PIXIEBRIX_SYMBOL]}`
  );
}

import "@/extensionContext";
import { reportError } from "@/telemetry/logging";

window.addEventListener("error", function (e) {
  // eslint-disable-next-line require-await
  reportError(e);
  return false;
});

window.addEventListener("unhandledrejection", function (e) {
  // eslint-disable-next-line require-await
  reportError(e);
});

import "@/blocks";
import "@/contrib";
import "@/contentScript/devTools";
import "@/contentScript/contextMenus";

// Import for the side effect of registering js defined blocks
import { handleNavigate } from "@/contentScript/lifecycle";
import { refresh as refreshServices } from "@/background/locator";
import "@/contentScript/externalProtocol";
import { notifyReady, whoAmI } from "@/contentScript/executor";
import "@/messaging/external";
import "@/contentScript/script";
import "notifyjs-browser";
import { updateTabInfo } from "@/contentScript/context";

const contextPromise = whoAmI()
  .then((sender) => {
    updateTabInfo({ tabId: sender.tab.id, frameId: sender.frameId });
    console.debug(
      `Loading contentScript for tabId=${sender.tab.id}, frameId=${sender.frameId}: ${window[PIXIEBRIX_SYMBOL]}`
    );
  })
  .catch((reason) => {
    console.warn("Error getting tabId/frameId", reason);
    throw reason;
  });

contextPromise
  .then(() => {
    // Reload services on background page for each new page. This is inefficient right now, but will
    // avoid confusion if service configurations are updated remotely
    return refreshServices().catch((reason) => {
      console.warn("Error refreshing service configurations", reason);
      throw reason;
    });
  })
  .then(() => {
    return handleNavigate().catch((reason) => {
      console.warn("Error initializing content script", reason);
      throw reason;
    });
  })
  .then(() => {
    // Let the background script know we're ready to execute remote actions
    return notifyReady().catch((reason) => {
      console.warn("Error pinging the background script", reason);
      throw reason;
    });
  });
