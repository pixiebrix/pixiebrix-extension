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

import { getCurrentURL } from "@/pageEditor/utils";
import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import {
  DISPLAY_REASON_EXTENSION_CONSOLE,
  DISPLAY_REASON_RESTRICTED_URL,
} from "@/tinyPages/restrictedUrlPopupConstants";
import { type ActivatePanelOptions } from "@/types/sidebarTypes";
import { isScriptableUrl } from "webext-content-scripts";

import { assertNotNullish } from "@/utils/nullishUtils";
import { isObject } from "@/utils/objectUtils";
import { type Target } from "webext-messenger";

export function getAssociatedTabId(): number {
  const tabId = new URLSearchParams(window.location.search).get("tabId");
  assertNotNullish(
    tabId,
    "getAssociatedTabId is only available in a sidepanel page",
  );
  return Number(tabId);
}

export function getTopLevelFrame(): Target {
  return {
    tabId: getAssociatedTabId(),
    frameId: 0,
  };
}

const PING_MESSAGE = "PING_SIDE_PANEL";
// Do not use the messenger because it doesn't support retry-less messaging
export function initSidePanelPingResponder() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      isObject(message) &&
      message.type === PING_MESSAGE &&
      sender.tab?.id === getAssociatedTabId()
    ) {
      sendResponse(true);
    }
  });
}

export async function isSidePanelOpen(): Promise<boolean> {
  const response = await chrome.runtime.sendMessage<
    { type: string },
    boolean | undefined
  >({ type: PING_MESSAGE });
  return Boolean(response); // TODO: Drop Boolean() after strictNullChecks migration
}

/**
 * Show a popover on restricted URLs because we're unable to inject content into the page. Previously we'd open
 * the Extension Console, but that was confusing because the action was inconsistent with how the button behaves
 * other pages.
 * @param tabUrl the url of the tab, or null if not accessible
 */
export function getPopoverUrl(tabUrl: string | null): string | null {
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

export function getSidebarPath(tabId: number, url: string): string {
  return getPopoverUrl(url) ?? "sidebar.html?tabId=" + tabId;
}

export async function showSidebarFromPageEditor(
  activateOptions?: ActivatePanelOptions,
) {
  await openSidePanel(
    chrome.devtools.inspectedWindow.tabId,
    await getCurrentURL(),
  );
}

export async function openSidePanel(tabId: number, url: string) {
  // Simultaneously define, enable, and open the side panel
  void chrome.sidePanel.setOptions({
    tabId,
    path: getSidebarPath(tabId, url),
    enabled: true,
  });
  await chrome.sidePanel.open({ tabId });
}
