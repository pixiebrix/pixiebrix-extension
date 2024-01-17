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

import { openSidePanel } from "@/sidebar/sidePanel/messenger/api";
import type { MessengerMeta } from "webext-messenger";
import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import {
  DISPLAY_REASON_EXTENSION_CONSOLE,
  DISPLAY_REASON_RESTRICTED_URL,
} from "@/tinyPages/restrictedUrlPopupConstants";
import { isScriptableUrl } from "webext-content-scripts";

export function getRestrictedPageMessage(
  tabUrl: string | undefined,
): string | null {
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

function getSidebarPath(tabId: number, url: string | undefined): string {
  return getRestrictedPageMessage(url) ?? "sidebar.html?tabId=" + tabId;
}

export async function showMySidePanel(this: MessengerMeta): Promise<void> {
  await openSidePanel(this.trace[0].tab.id);
}

// TODO: Drop if this is ever implemented: https://github.com/w3c/webextensions/issues/515
export async function initSidePanel(): Promise<void> {
  // TODO: Drop this once the popover URL behavior is merged into sidebar.html
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      void chrome.sidePanel.setOptions({
        tabId,
        path: getSidebarPath(tabId, changeInfo.url),
      });
    }
  });

  // We need to target _all_ tabs, not just those we have access to
  const existingTabs = await chrome.tabs.query({});
  await Promise.all(
    existingTabs.map(async ({ id, url }) =>
      chrome.sidePanel.setOptions({
        tabId: id,
        path: getSidebarPath(id, url),
        enabled: true,
      }),
    ),
  );
}
