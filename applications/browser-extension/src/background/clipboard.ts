/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { lastFocusedTarget } from "../utils/focusTracker";
import {
  type Sender,
  type Target,
  type PageTarget,
  getMethod,
} from "webext-messenger";
import { type ClipboardText } from "../utils/clipboardUtils";

// `WRITE_TO_CLIPBOARD` can be handled by multiple contexts, that's why it's here and not in their /api.ts files
const writeToClipboardInTarget = getMethod("WRITE_TO_CLIPBOARD");

/**
 * Given a `Sender` as defined by the native Chrome Messaging API,
 * return a uniquely-idenfying Target usable by the Messenger.
 * It returns `undefined` for tab-less HTTP senders; they must be either in tabs or chrome-extension:// pages.
 */
function extractTargetFromSender(
  sender: Sender,
): Target | PageTarget | undefined {
  const tabId = sender.tab?.id;
  const { frameId, url } = sender;
  if (tabId != null && frameId != null) {
    return {
      tabId,
      frameId,
    };
  }

  const rootExtensionUrl = chrome.runtime.getURL("");
  if (url?.startsWith(rootExtensionUrl)) {
    // Tab-less contexts like the sidePanel and dev tools
    return {
      page: url.replace(rootExtensionUrl, ""),
    };
  }

  // Untargetable sender (e.g. an iframe in the sidebar, page editor, etc.)
  // https://github.com/pixiebrix/pixiebrix-extension/issues/7565
}

// TODO: After the MV3 migration, just use chrome.offscreen instead
// https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3
// https://github.com/GoogleChrome/chrome-extensions-samples/tree/73265836c40426c004ac699a6e19b9d56590cdca/functional-samples/cookbook.offscreen-clipboard-write
export default async function writeToClipboardInFocusedContext(
  item: ClipboardText,
): Promise<boolean> {
  const lastFocusedDocument = await lastFocusedTarget.get();
  if (lastFocusedDocument) {
    const target = extractTargetFromSender(lastFocusedDocument);
    if (target) {
      // The target might be any context that calls `markDocumentAsFocusableByUser`.
      // Also, just because they were the lastFocusedDocument, it doesn't mean that
      // they are still focused at a OS level, so this might return false.
      return writeToClipboardInTarget(target, item);
    }
  }

  // Try just getting the frontmost tab
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) {
    return writeToClipboardInTarget({ tabId: tab.id }, item);
  }

  // Dead code, there's always at least one tab, but not worth throwing
  return false;
}
