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

/**
 * @file This file defines the public API for the sidePanel, with some
 * exceptions that use `expectContext`. It uses the `messenger/api.ts` name
 * to match that expectation and avoid lint issues.
 */

import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import {
  DISPLAY_REASON_EXTENSION_CONSOLE,
  DISPLAY_REASON_RESTRICTED_URL,
} from "@/tinyPages/restrictedUrlPopupConstants";
import { isScriptableUrl } from "webext-content-scripts";
import { isObject } from "@/utils/objectUtils";
import { expectContext } from "@/utils/expectContext";
import { type Target } from "webext-messenger";

export function getAssociatedTabId(): number {
  expectContext("sidebar");
  const tabId = new URLSearchParams(window.location.search).get("tabId");
  return Number(tabId);
}

export function getAssociatedTarget(): Target {
  return { tabId: getAssociatedTabId(), frameId: 0 };
}

const PING_MESSAGE = "PING_SIDE_PANEL";
// Do not use the messenger because it doesn't support retry-less messaging
// TODO: Drop after https://github.com/pixiebrix/webext-messenger/issues/59
export function respondToPings() {
  expectContext("sidebar");
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
  // Sync check where possible
  if (isSidePanelOpenSync() === false) {
    return false;
  }

  const response = await chrome.runtime.sendMessage<
    { type: string },
    boolean | undefined
  >({ type: PING_MESSAGE });
  return Boolean(response); // TODO: Drop Boolean() after strictNullChecks migration
}

export function getPopoverUrl(tabUrl: string | undefined): string | null {
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

export async function openSidePanel(tabId: number, url: string) {
  // Simultaneously define, enable, and open the side panel
  void chrome.sidePanel.setOptions({
    tabId,
    path: getSidebarPath(tabId, url),
    enabled: true,
  });
  await chrome.sidePanel.open({ tabId });
}

export async function hideSidePanel(tabId: number) {
  void chrome.sidePanel.setOptions({
    tabId,
    enabled: false,
  });
}

// Approximate sidebar width in pixels. Used to determine whether it's open
const MINIMUM_SIDEBAR_WIDTH = 300;

/**
 * Determines whether the sidebar is open.
 * @returns false when it's definitely closed
 * @returns 'unknown' when it cannot be determined
 */
// The type cannot be `undefined` due to strictNullChecks
function isSidePanelOpenSync(): false | "unknown" {
  if (!globalThis.window) {
    return "unknown";
  }

  return window.outerWidth - window.innerWidth > MINIMUM_SIDEBAR_WIDTH
    ? "unknown"
    : false;
}

// TODO: It doesn't work when the dev tools are open on the side
// Official event requested in https://github.com/w3c/webextensions/issues/517
export function onSidePanelClosure(controller: AbortController): void {
  expectContext("contentScript");
  window.addEventListener(
    "resize",
    () => {
      if (isSidePanelOpenSync() === false) {
        controller.abort();
      }
    },
    { signal: controller.signal },
  );
}
