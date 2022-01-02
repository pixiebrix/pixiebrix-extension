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

import browser, { Runtime, WebNavigation } from "webextension-polyfill";
import { TabId } from "@/background/devtools/contract";
import { isBackground } from "webext-detect-page";
import { ensureContentScript } from "@/background/util";
import { getErrorMessage, isPrivatePageError } from "@/errors";

const connections = new Map<TabId, Runtime.Port>();

/**
 * Listener to inject contentScript on tabs that user has granted temporary access to and that the devtools
 * are open. If the user has granted permanent access, the content script will be injected based on the
 * dynamic content script permissions via `webext-dynamic-content-scripts`
 */
async function attemptTemporaryAccess({
  tabId,
  frameId,
  url,
}: WebNavigation.OnDOMContentLoadedDetailsType): Promise<void> {
  if (!connections.has(tabId)) {
    return;
  }

  console.debug("attemptTemporaryAccess:", { tabId, frameId, url });

  try {
    await ensureContentScript({ tabId, frameId });
  } catch (error) {
    if (isPrivatePageError(error)) {
      return;
    }

    // Side note: Cross-origin iframes lose the `activeTab` after navigation
    // https://github.com/pixiebrix/pixiebrix-extension/pull/661#discussion_r661590847
    if (/Cannot access|missing host permission/.test(getErrorMessage(error))) {
      console.debug(
        "Skipping attemptTemporaryAccess because no activeTab permissions",
        { tabId, frameId, url }
      );
      return;
    }

    throw error;
  }
}

if (isBackground()) {
  console.debug("Adding devtools connection listener");
  browser.webNavigation.onDOMContentLoaded.addListener((details) => {
    void attemptTemporaryAccess(details);
  });
}
