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

// `true` if the sidepanel is open, false if closed
let sidePanelOpen = false;

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
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "sidepanel") {
        sidePanelOpen = true;

        port.onDisconnect.addListener(async () => {
          sidePanelOpen = false;
        });

        port.onMessage.addListener(async (message) => {
          // FIXME: keep track based on tab
          if (message.type === "keepalive") {
            console.debug("browserAction:keepalive", message);
            sidePanelOpen = !message.hidden;
          }
        });
      }
    });

    browserAction.onClicked.addListener(async (tab) => {
      const tabId = tab.id;

      // The Chrome example calls open first:
      // https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.sidepanel-open/script.js#L9

      // Needs be called first so it's from the user gesture. Could be this timing bug:
      // - https://stackoverflow.com/a/77213912
      // - https://bugs.chromium.org/p/chromium/issues/detail?id=1478648

      // FIXME: this works, but then errors out if the sidebar has been hidden via
      //   await chrome.sidePanel.setOptions({
      //     tabId,
      //     enabled: false,
      //  });

      // await chrome.sidePanel.open({
      //   tabId,
      // });

      // await chrome.sidePanel.setOptions({
      //   tabId,
      //   path: `sidebar.html?tabId=${tabId}`,
      //   enabled: true,
      // });

      // TODO: figure out how to toggle based on the current state. I tried wrapping in a chrome.sidePanel.getOptions
      //   but to check if it's enabled for the tab, but that causes the user gesture to be lost during the check.
      //   We'll likely need to keep track of current state in a module variable. See comments in
      //   sidebarDomControllerLiteMv3.ts:isSidebarFrameVisible

      if (sidePanelOpen) {
        // Force switch over to PixieBrix panel so disabling it closes the whole sidebar
        await chrome.sidePanel.open({
          tabId,
        });

        void chrome.sidePanel.setOptions({
          tabId,
          enabled: false,
        });

        sidePanelOpen = false;
      } else {
        // Call setOptions first to handle case where the sidebar has been disabled on the page to hide the sidebar
        // Use callback to keep the user gesture context. See bug comment above.
        chrome.sidePanel.setOptions(
          {
            tabId,
            path: `sidebar.html?tabId=${tabId}`,
            enabled: true,
          },
          () => {
            chrome.sidePanel.open(
              {
                tabId,
              },
              () => {
                sidePanelOpen = true;
              },
            );
          },
        );
      }
    });
  } else {
    browserAction.onClicked.addListener(handleBrowserAction);
  }

  // Track the active tab URL. We need to update the popover every time status the active tab/active URL changes.
  // https://github.com/facebook/react/blob/bbb9cb116dbf7b6247721aa0c4bcb6ec249aa8af/packages/react-devtools-extensions/src/background/tabsManager.js#L29
  setActionPopup(getPopoverUrl);
}
