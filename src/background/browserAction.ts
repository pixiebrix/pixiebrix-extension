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
import webextAlert from "./webextAlert";
import { browserAction, isMV3, type Tab } from "@/mv3/api";
import { executeScript, isScriptableUrl } from "webext-content-scripts";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import {
  DISPLAY_REASON_EXTENSION_CONSOLE,
  DISPLAY_REASON_RESTRICTED_URL,
} from "@/tinyPages/restrictedUrlPopupConstants";
import { setActionPopup } from "webext-tools";

const ERR_UNABLE_TO_OPEN =
  "PixieBrix was unable to open the Sidebar. Try refreshing the page.";

// The sidebar is always injected to into the top level frame
const TOP_LEVEL_FRAME_ID = 0;

const toggleSidebar = memoizeUntilSettled(_toggleSidebar);

// Don't accept objects here as they're not easily memoizable
async function _toggleSidebar(tabId: number, tabUrl: string): Promise<void> {
  console.debug("browserAction:toggleSidebar", tabId, tabUrl);

  // Load the raw toggle script first, then the content script. The browser executes them
  // in order, but we don't need to use `Promise.all` to await them at the same time as we
  // want to catch each error separately.
  const sidebarTogglePromise = executeScript({
    tabId,
    frameId: TOP_LEVEL_FRAME_ID,
    files: ["browserActionInstantHandler.js"],
    matchAboutBlank: false,
    allFrames: false,
    // Run at end instead of idle to ensure immediate feedback to clicking the browser action icon
    runAt: "document_end",
  });

  // Chrome adds automatically at document_idle, so it might not be ready yet when the user click the browser action
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
  await toggleSidebar(tab.id, url);
}

/**
 * Show a popover on restricted URLs because we're unable to inject content into the page. Previously we'd open
 * the Extension Console, but that was confusing because the action was inconsistent with how the button behaves
 * other pages.
 * @param tabUrl the url of the tab, or null if not accessible
 */
function getPopoverUrl(tabUrl: string | null): string | null {
  const popoverUrl = browser.runtime.getURL("restrictedUrlPopup.html");

  if (tabUrl?.startsWith(getExtensionConsoleUrl())) {
    return `${popoverUrl}?reason=${DISPLAY_REASON_EXTENSION_CONSOLE}`;
  }

  if (!isScriptableUrl(tabUrl)) {
    return `${popoverUrl}?reason=${DISPLAY_REASON_RESTRICTED_URL}`;
  }

  // The popup is disabled, and the extension will receive browserAction.onClicked events.
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setPopup#popup
  return null;
}

export default function initBrowserAction(): void {
  if (isMV3()) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

    browserAction.onClicked.addListener((tab) => {
      console.log("xxxxxxxxxx", { tabId: tab.id });
      chrome.sidePanel.open({ tabId: tab.id });
    });
  } else {
    browserAction.onClicked.addListener(handleBrowserAction);
  }

  // Track the active tab URL. We need to update the popover every time status the active tab/active URL changes.
  // https://github.com/facebook/react/blob/bbb9cb116dbf7b6247721aa0c4bcb6ec249aa8af/packages/react-devtools-extensions/src/background/tabsManager.js#L29
  setActionPopup(getPopoverUrl);
}
