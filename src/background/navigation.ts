/* eslint-disable filenames/match-exported */
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

import browser, { WebNavigation } from "webextension-polyfill";
import { handleNavigate, reactivateTab } from "@/contentScript/messenger/api";
import { forEachTab } from "@/background/util";
import { doesTabHaveAccess } from "@/background/activeTab";

async function onHistoryUpdate({
  tabId,
  frameId,
  url,
}: WebNavigation.OnHistoryStateUpdatedDetailsType): Promise<void> {
  if (await doesTabHaveAccess({ tabId, url })) {
    handleNavigate({ tabId, frameId });
  }
}

function initNavigation(): void {
  // Updates from the history API. There's no other way: https://stackoverflow.com/q/4570093/288906
  browser.webNavigation.onHistoryStateUpdated.addListener(onHistoryUpdate);
}

export function reactivateEveryTab(): void {
  console.debug("Reactivate all tabs");
  void forEachTab(reactivateTab);
}

export default initNavigation;
