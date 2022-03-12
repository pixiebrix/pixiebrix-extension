/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { forEachTab } from "@/background/util";
import { canAccessTab } from "webext-tools";
import { Target } from "@/types";

export function reactivateEveryTab(): void {
  console.debug("Reactivate all tabs");
  void forEachTab(reactivateTab);
}

async function onNavigation({ tabId, frameId }: Target): Promise<void> {
  if (await canAccessTab({ tabId, frameId })) {
    handleNavigate({ tabId, frameId });
  }
}

function initNavigation(): void {
  // Let the content script know about navigation from the history API. Required for handling SPA navigation
  browser.webNavigation.onHistoryStateUpdated.addListener(onNavigation);
}

export default initNavigation;
