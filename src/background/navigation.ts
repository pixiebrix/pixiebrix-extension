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

import { type Target } from "@/types/messengerTypes";
import { canAccessTab } from "@/permissions/permissionsUtils";
import {
  isScriptableUrl,
  canAccessTab as canInjectTab,
} from "webext-content-scripts";
import { debounce } from "lodash";
import { getTabUrl } from "webext-tools";
import { isTargetReady } from "@/contentScript/ready";
import { flagOn } from "@/auth/featureFlagStorage";
import { activatePrerenderedTab } from "@/contentScript/messenger/api";

/**
 * Log details about a navigation to the console for debugging content script/navigation bugs.
 */
async function traceNavigation(target: Target): Promise<void> {
  const tabUrl = await getTabUrl(target);

  console.debug("onNavigation: tab: %s, frame: %s", tabUrl, target.frameId, {
    ...target,
    tabUrl,
    isScriptableUrl: isScriptableUrl(tabUrl),
    isTargetReady: isTargetReady(target),
    canInject: canInjectTab(target),
    // PixieBrix has some additional constraints on which tabs can be accessed (i.e., only http/https)
    canAccessTab: canAccessTab(target),
  });
}

// Some sites use the hash to encode page state (e.g., filters). There are some non-navigation scenarios where the hash
// could change frequently (e.g., there is a timer in the state). Debounce to avoid overloading the messenger and
// contentScript.
const debouncedTraceNavigation = debounce(traceNavigation, 100, {
  leading: true,
  trailing: true,
  maxWait: 1000,
});

async function initNavigation(): Promise<void> {
  const navigationTraceFlag = flagOn("navigation-trace");

  // Notifies the content script when their tab is active so that if they were prerendered,
  // they can begin to mount their mods (which avoids mods mounting before a page is actually visible
  // and affecting other extension state such as the sidebar).
  // See: https://developer.chrome.com/blog/extension-instantnav
  chrome.webNavigation.onCommitted.addListener(async (detail) => {
    if (detail.documentLifecycle === "active" && detail.frameId === 0) {
      if (await navigationTraceFlag) {
        console.debug("activating prerendered tab", detail);
      }

      activatePrerenderedTab({
        tabId: detail.tabId,
        frameId: "allFrames",
      });
    }
  });

  if (!(await navigationTraceFlag)) {
    return;
  }

  browser.webNavigation.onHistoryStateUpdated.addListener(
    debouncedTraceNavigation,
  );
  browser.webNavigation.onReferenceFragmentUpdated.addListener(
    debouncedTraceNavigation,
  );
}

export default initNavigation;
