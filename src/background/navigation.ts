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
import { type Target } from "@/types";
import { canAccessTab } from "@/utils/permissions";
import { debounce } from "lodash";

export function reactivateEveryTab(): void {
  console.debug("Reactivate all tabs");
  void forEachTab(reactivateTab);
}

async function onNavigation({ tabId, frameId }: Target): Promise<void> {
  if (await canAccessTab({ tabId, frameId })) {
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
