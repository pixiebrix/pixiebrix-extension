/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { ensureContentScript } from "@/background/util";
import { Tabs } from "webextension-polyfill";
import { rehydrateSidebar } from "@/contentScript/messenger/api";
import { executeScript, isScriptableUrl } from "webext-content-scripts";
import pMemoize from "p-memoize";
import webextAlert from "./webextAlert";

const ERR_UNABLE_TO_OPEN =
  "PixieBrix was unable to open the Sidebar. Try refreshing the page.";

// The sidebar is always injected to into the top level frame
const TOP_LEVEL_FRAME_ID = 0;

// Avoid triggering multiple requests at once and causing multiple error alerts.
// This patterns "debounces" calls while the promise is pending:
// https://github.com/sindresorhus/promise-fun/issues/15
const toggleSidebar = pMemoize(_toggleSidebar, {
  cache: false,
});

// Don't accept objects here as they're not easily memoizable
async function _toggleSidebar(tabId: number, tabUrl: string): Promise<void> {
  if (!tabUrl.startsWith("http") || !isScriptableUrl(tabUrl)) {
    // Page not supported. Open the options page instead
    void browser.runtime.openOptionsPage();
    return;
  }

  // Load the raw toggle script first, then the content script. The browser executes them
  // in order but we don't need to use `Promise.all` to await them at the same time as we
  // want to catch each error separately.
  const sidebarTogglePromise = executeScript({
    tabId,
    files: ["browserActionInstantHandler.js"],
  });
  const contentScriptPromise = ensureContentScript({
    tabId,
    frameId: TOP_LEVEL_FRAME_ID,
  });

  try {
    await sidebarTogglePromise;
  } catch (error) {
    webextAlert(ERR_UNABLE_TO_OPEN);
    throw error;
  }

  // NOTE: at this point, the sidebar should already be visible on the page, even if not ready.
  // Avoid showing any alerts or notifications: further messaging can appear in the sidebar itself.
  // Any errors are automatically reported by the global error handler.
  await contentScriptPromise;
  await rehydrateSidebar({
    tabId,
  });
}

async function handleBrowserAction(tab: Tabs.Tab): Promise<void> {
  await toggleSidebar(tab.id, String(tab.url));
}

export default function initBrowserAction() {
  // Handle namespace change between MV2/MV3
  const action = browser.browserAction ?? browser.action;
  action.onClicked.addListener(handleBrowserAction);
}
