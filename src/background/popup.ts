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

import { browser, Tabs } from "webextension-polyfill-ts";
import { expectBackgroundPage } from "@/utils/expectContext";
import { isChrome } from "@/helpers";
import { liftBackground } from "@/background/protocol";

const WINDOW_WIDTH_PX = 400; // Makes the native prompt appear centered
const WINDOW_HEIGHT_PX = 215; // Includes titlebar height, must fit the content and error to avoid scrollbars

async function onTabClose(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const handlePossibleClosure = (closeTabId: number) => {
      if (closeTabId === tabId) {
        // Remove listener first to ensure it's removed even if resolve throws
        browser.tabs.onRemoved.removeListener(handlePossibleClosure);
        resolve();
      }
    };

    browser.tabs.onRemoved.addListener(handlePossibleClosure);
  });
}

async function openTab(url: string, tabId: number): Promise<Tabs.Tab> {
  return browser.tabs.create({
    url: String(url),
    openerTabId: tabId, // This makes the tab appear right after the target tab
  });
}

async function createPopup(url: string | URL): Promise<Tabs.Tab> {
  const window = await browser.windows.create({
    url: String(url),
    focused: true,
    height: WINDOW_HEIGHT_PX,
    width: WINDOW_WIDTH_PX,
    top: Math.round((screen.availHeight - WINDOW_HEIGHT_PX) / 2),
    left: Math.round((screen.availWidth - WINDOW_WIDTH_PX) / 2),
    type: "popup",
  });

  return window.tabs[0];
}

/**
 * Return true if popups are expected to work properly for the user agent / operating system.
 */
async function detectPopupSupport(tabId: number): Promise<boolean> {
  expectBackgroundPage();

  if (isChrome || !navigator.userAgent.includes("Macintosh")) {
    return true;
  }

  // Firefox on Mac seems to be unable to handle popups in fullscreen mode, changing the macOS "space"
  // back to the desktop
  const currentTab = await browser.tabs.get(tabId);
  const currentWindow = await browser.windows.get(currentTab.windowId);
  return currentWindow.state !== "fullscreen";
}

/**
 * Show a popup prompt and await the popup closing
 */
export const openPopupPrompt = liftBackground(
  "OPEN_POPUP_PROMPT",
  async (openerTabId: number, url: string) => {
    const tab = (await detectPopupSupport(openerTabId))
      ? await createPopup(url)
      : await openTab(url, openerTabId);
    await onTabClose(tab.id);
  }
);
