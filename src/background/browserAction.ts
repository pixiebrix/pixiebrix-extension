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

import { ensureContentScript } from "@/background/contentScript";
import { rehydrateSidebar } from "@/contentScript/messenger/api";
import { executeScript } from "webext-content-scripts";
import webextAlert from "./webextAlert";
import { memoizeUntilSettled, isMac } from "@/utils";
import { notify } from "@/options/messenger/api";
import { browserAction, type Tab } from "@/mv3/api";
import { isScriptableUrl } from "@/utils/permissions";

const ERR_UNABLE_TO_OPEN =
  "PixieBrix was unable to open the Sidebar. Try refreshing the page.";

const keyboardShortcut = isMac() ? "Cmd+Opt+C" : "Ctrl+Shift+C";
const MSG_NO_SIDEBAR_ON_OPTIONS_PAGE = `PixieBrix Tip 💜\n If you want to create a new blueprint, first navigate to the page you want to modify, then open PixieBrix in the DevTools (${keyboardShortcut}).`;

// The sidebar is always injected to into the top level frame
const TOP_LEVEL_FRAME_ID = 0;

const toggleSidebar = memoizeUntilSettled(_toggleSidebar);

// Don't accept objects here as they're not easily memoizable
async function _toggleSidebar(tabId: number, tabUrl: string): Promise<void> {
  if (!isScriptableUrl(tabUrl)) {
    // Page not supported. Open the options page instead
    void browser.runtime.openOptionsPage();
    return;
  }

  // Load the raw toggle script first, then the content script. The browser executes them
  // in order but we don't need to use `Promise.all` to await them at the same time as we
  // want to catch each error separately.
  const sidebarTogglePromise = executeScript({
    tabId,
    frameId: TOP_LEVEL_FRAME_ID,
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

async function handleBrowserAction(tab: Tab): Promise<void> {
  // The URL might not be available in certain circumstances. This silences these
  // cases and just treats them as "not allowed on this page"
  const url = String(tab.url);
  const optionsPage = browser.runtime.getURL("options.html");

  if (url.startsWith(optionsPage)) {
    notify.info(
      { tabId: tab.id, page: "/options.html" },
      {
        id: "MSG_NO_SIDEBAR_ON_OPTIONS_PAGE",
        message: MSG_NO_SIDEBAR_ON_OPTIONS_PAGE,
      }
    );
  } else {
    await toggleSidebar(tab.id, url);
  }
}

export default function initBrowserAction() {
  browserAction.onClicked.addListener(handleBrowserAction);
}
