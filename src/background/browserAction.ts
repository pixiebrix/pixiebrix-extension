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

import { isBackground } from "webext-detect-page";
import { reportError } from "@/telemetry/logging";
import { ensureContentScript, showErrorInOptions } from "@/background/util";
import browser, { Tabs } from "webextension-polyfill";
import { toggleActionPanel } from "@/contentScript/messenger/api";
import { isScriptableUrl } from "webext-content-scripts";

const MESSAGE_PREFIX = "@@pixiebrix/background/browserAction/";
export const FORWARD_FRAME_NOTIFICATION = `${MESSAGE_PREFIX}/FORWARD_ACTION_FRAME_NOTIFICATION`;

// The sidebar is always injected to into the top level frame
const TOP_LEVEL_FRAME_ID = 0;

async function handleBrowserAction(tab: Tabs.Tab): Promise<void> {
  const url = String(tab.url);
  if (!isScriptableUrl(url)) {
    void showErrorInOptions("ERR_BROWSER_ACTION_TOGGLE_WEBSTORE", tab.index);
    return;
  }

  if (!url.startsWith("http")) {
    // Page not supported. Open the options page instead
    void browser.runtime.openOptionsPage();
    return;
  }

  try {
    await ensureContentScript({ tabId: tab.id, frameId: TOP_LEVEL_FRAME_ID });
    await toggleActionPanel({
      tabId: tab.id,
    });
  } catch (error) {
    await showErrorInOptions("ERR_BROWSER_ACTION_TOGGLE", tab.index);
    console.error(error);
    reportError(error);
  }
}

if (isBackground()) {
  const action = browser.browserAction ?? browser.action;
  action.onClicked.addListener(handleBrowserAction);
}
