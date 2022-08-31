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

import reportError from "@/telemetry/reportError";
import { ensureContentScript } from "@/background/util";
import { Tabs } from "webextension-polyfill";
import { rehydrateSidebar } from "@/contentScript/messenger/api";
import { executeScript, isScriptableUrl } from "webext-content-scripts";
import webextAlert from "@/background/webextAlert";
import { isMac } from "@/utils";

// The sidebar is always injected to into the top level frame
const TOP_LEVEL_FRAME_ID = 0;

async function handleBrowserAction(tab: Tabs.Tab): Promise<void> {
  const url = String(tab.url);

  const extensionConsoleUrl = browser.runtime.getURL("");

  if (url.startsWith(extensionConsoleUrl)) {
    const keyboardShortcut = `${isMac() ? "Cmd+Opt" : "Ctrl+Shift"}+C`;
    webextAlert(
      `Tip: If you want to create a new blueprint, first navigate to the page you want to modify, then open PixieBrix in DevTools (${keyboardShortcut}).`
    );
  }

  if (!url.startsWith("http") || !isScriptableUrl(url)) {
    void browser.runtime.openOptionsPage();
    return;
  }

  try {
    await Promise.all([
      // Toggle the sidebar every time it's run
      executeScript({
        tabId: tab.id,
        files: ["browserActionInstantHandler.js"],
      }),

      // Run the usual content script unless it's already loaded
      ensureContentScript({ tabId: tab.id, frameId: TOP_LEVEL_FRAME_ID }),
    ]);
    await rehydrateSidebar({
      tabId: tab.id,
    });
  } catch (error) {
    // We no longer `showErrorInOptions` because it may appear several seconds later
    // https://github.com/pixiebrix/pixiebrix-extension/issues/4021
    reportError(
      new Error("Error opening sidebar via browser action", { cause: error })
    );
  }
}

export default function initBrowserAction() {
  // Handle namespace change between MV2/MV3
  const action = browser.browserAction ?? browser.action;
  action.onClicked.addListener(handleBrowserAction);
}
