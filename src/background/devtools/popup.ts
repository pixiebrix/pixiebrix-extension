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

import { Tabs } from "webextension-polyfill-ts";
import { liftBackground } from "@/background/devtools/internal";
import { Target } from "@/background/devtools/contract";

const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 150;

async function onTabClose(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const handlePossibleClosure = (closeTabId: number) => {
      if (closeTabId === tabId) {
        resolve();
        browser.tabs.onRemoved.removeListener(handlePossibleClosure);
      }
    };
    browser.tabs.onRemoved.addListener(handlePossibleClosure);
  });
}

async function openTab(url: string, target: Target): Promise<Tabs.Tab> {
  return browser.tabs.create({
    url: String(url),
    openerTabId: target.tabId, // This makes the tab appear right after the target tab
  });
}

async function _openPopup(url: string): Promise<Tabs.Tab> {
  const window = await browser.windows.create({
    url: String(url),
    focused: true,
    height: WINDOW_HEIGHT,
    width: WINDOW_WIDTH,
    top: Math.round((screen.availHeight - WINDOW_HEIGHT) / 2),
    left: Math.round((screen.availWidth - WINDOW_WIDTH) / 2),
    type: "popup",
  });

  return window.tabs[0];
}

/** Firefox seems to be unable to handle popups in fullscreens, changing the macOS "space" back to the desktop */
async function arePopupsBuggy(target: Target): Promise<boolean> {
  if (!navigator.userAgent.includes("Macintosh")) {
    return false;
  }

  const currentTab = await browser.tabs.get(target.tabId);
  const currentWindow = await browser.windows.get(currentTab.windowId);
  return currentWindow.state === "fullscreen";
}

async function handleRequest(url: string, target: Target): Promise<void> {
  const tab = arePopupsBuggy(target)
    ? await openTab(url, target)
    : await _openPopup(url);
  await onTabClose(tab.id);
}
export const openPopup = liftBackground(
  "OPEN_POPUP",
  (target: Target) => async (url: string) => handleRequest(url, target)
);
