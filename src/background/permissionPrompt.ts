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

import { Tabs, Windows } from "webextension-polyfill";
import { isFirefox } from "webext-detect-page";
import { isMac } from "@/utils";

const POPUP_WIDTH_PX = 400; // Makes the native prompt appear centered
const POPUP_HEIGHT_PX = 215; // Includes titlebar height, must fit the content and error to avoid scrollbars

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

async function openTab(url: string, openerTabId: number): Promise<Tabs.Tab> {
  return browser.tabs.create({
    url,
    openerTabId, // Makes the new tab appear right after the opener
  });
}

async function openPopup(
  url: string,
  opener: Windows.Window
): Promise<Tabs.Tab> {
  // `top` and `left` are ignored in .create on Firefox, but attempt anyway.
  // If present, the popup will be centered on screen rather than on the window.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1396881
  const window = await browser.windows.create({
    url,
    focused: true,
    top: Math.round(opener.top + (opener.height - POPUP_HEIGHT_PX) / 2),
    left: Math.round(opener.left + (opener.width - POPUP_WIDTH_PX) / 2),
    height: POPUP_HEIGHT_PX,
    width: POPUP_WIDTH_PX,
    type: "popup",
  });

  return window.tabs[0];
}

/**
 * Return true if popups are expected to work properly for the user agent / operating system.
 */
function detectPopupSupport(currentWindow: Windows.Window): boolean {
  // Firefox on Mac seems to be unable to handle popups in fullscreen mode, changing the macOS "space"
  // back to the desktop
  const isBuggy =
    isFirefox() && isMac() && currentWindow.state === "fullscreen";
  return !isBuggy;
}

/**
 * Show a popup prompt and await the popup closing
 */
export async function openPopupPrompt(openerTabId: number, url: string) {
  const { windowId } = await browser.tabs.get(openerTabId);
  const openerWindow = await browser.windows.get(windowId);

  const popupTab = detectPopupSupport(openerWindow)
    ? await openPopup(url, openerWindow)
    : await openTab(url, openerTabId);

  await onTabClose(popupTab.id);
}
