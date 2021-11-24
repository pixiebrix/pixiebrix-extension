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

import { isBackgroundPage } from "webext-detect-page";
import { reportError } from "@/telemetry/logging";
import { ensureContentScript, showErrorInOptions } from "@/background/util";
import browser, { Tabs } from "webextension-polyfill";
import { safeParseUrl } from "@/utils";
import { emitDevtools } from "@/background/devtools/internal";
import { toggleActionPanel } from "@/contentScript/messenger/api";

const MESSAGE_PREFIX = "@@pixiebrix/background/browserAction/";
export const FORWARD_FRAME_NOTIFICATION = `${MESSAGE_PREFIX}/FORWARD_ACTION_FRAME_NOTIFICATION`;

// The sidebar is always injected to into the top level frame
const TOP_LEVEL_FRAME_ID = 0;

const webstores = ["chrome.google.com", "addons.mozilla.org"];
async function handleBrowserAction(tab: Tabs.Tab): Promise<void> {
  const { protocol, hostname } = safeParseUrl(tab.url);
  if (webstores.includes(hostname)) {
    void showErrorInOptions("ERR_BROWSER_ACTION_TOGGLE_WEBSTORE", tab.index);
    return;
  }

  if (!protocol.startsWith("http")) {
    // Page not supported. Open the options page instead
    void browser.runtime.openOptionsPage();
    return;
  }

  try {
    await ensureContentScript({ tabId: tab.id, frameId: TOP_LEVEL_FRAME_ID });
    await toggleActionPanel({
      tabId: tab.id,
    });

    // Inform editor that it now has the ActiveTab permission, if it's open
    emitDevtools("HistoryStateUpdate", {
      tabId: tab.id,
      frameId: TOP_LEVEL_FRAME_ID,
    });
  } catch (error: unknown) {
    await showErrorInOptions("ERR_BROWSER_ACTION_TOGGLE", tab.index);
    console.error(error);
    reportError(error);
  }
}

if (isBackgroundPage()) {
  browser.browserAction.onClicked.addListener(handleBrowserAction);
  console.debug("Installed browserAction click listener");
}
