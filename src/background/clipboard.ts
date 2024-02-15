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

import { lastFocusedTarget } from "@/utils/focusTracker";
import { writeToClipboard } from "@/contentScript/messenger/strict/api";
import { type Sender, type Target, type PageTarget } from "webext-messenger";
import { ClipboardText } from "@/utils/clipboardUtils";

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
  // Unknown sender
}

export default async function writeToClipboardInFocusedContext(
  item: ClipboardText,
): Promise<boolean> {
  const lastFocusedDocument = await lastFocusedTarget.get();
  if (lastFocusedDocument) {
    const target = extractTargetFromSender(lastFocusedDocument);
    if (!target) {
      return false;
    }

    // The target might be any context that calls `markContextAsFocusableByUser`.
    // Also, just because they were the lastFocusedDocument, it doesn't mean that
    // they are still focused at a OS level, so this might return false.
    return writeToClipboard(target, item);
  }

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) {
    return writeToClipboard({ tabId: tab.id }, item);
  }

  return false;
}
