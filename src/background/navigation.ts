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

import { reactivateTab, handleNavigate } from "@/contentScript/messenger/api";
import { forEachTab } from "@/background/activeTab";
import { type Target } from "@/types/messengerTypes";
import { canAccessTab, isScriptableUrl } from "@/permissions/permissionsUtils";
import { debounce } from "lodash";
import { syncFlagOn } from "@/store/syncFlags";
import { canAccessTab as canInjectTab, getTabUrl } from "webext-tools";
import { isContentScriptRegistered } from "webext-dynamic-content-scripts/utils";
import { getTargetState } from "@/contentScript/ready";

export function reactivateEveryTab(): void {
  console.debug("Reactivate all tabs");
  void forEachTab(reactivateTab);
}

/**
 * Log details about a navigation to the console for debugging content script/navigation bugs.
 */
async function traceNavigation(target: Target): Promise<void> {
  const tabUrl = await getTabUrl(target);

  console.debug("onNavigation: tab: %s, frame: %s", tabUrl, target.frameId, {
    ...target,
    tabUrl,
    isScriptableUrl: isScriptableUrl(tabUrl),
    contentScriptState: await getTargetState(target),
    isContentScriptRegistered: await isContentScriptRegistered(tabUrl),
    canInject: await canInjectTab(target),
    // PixieBrix has some additional constraints on which tabs can be accessed (i.e., only https:)
    canAccessTab: await canAccessTab(target),
  });
}

async function onNavigation({ tabId, frameId }: Target): Promise<void> {
  if (syncFlagOn("navigation-trace")) {
    await traceNavigation({ tabId, frameId });
  }

  if (await canAccessTab({ tabId, frameId })) {
    // The content script will already be injected on webNavigation.onCommitted via webext-dynamic-content-scripts and
    // content-scripts-register-polyfill, so we don't have to call ensureContentScript before messaging the
    // content script with handleNavigate.
    handleNavigate({ tabId, frameId });
  }
}

// Some sites use the hash to encode page state (e.g., filters). There are some non-navigation scenarios where the hash
// could change frequently (e.g., there is a timer in the state). Debounce to avoid overloading the messenger and
// contentScript.
const debouncedOnNavigation = debounce(onNavigation, 100, {
  leading: true,
  trailing: true,
  maxWait: 1000,
});

function initNavigation(): void {
  // Let the content script know about navigation from the history API. Required for handling SPA navigation
  browser.webNavigation.onHistoryStateUpdated.addListener(onNavigation);
  browser.webNavigation.onReferenceFragmentUpdated.addListener(
    debouncedOnNavigation
  );
}

export default initNavigation;
