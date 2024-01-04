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

import type { MessengerMeta } from "webext-messenger";

export async function showSidebarPanel(this: MessengerMeta): Promise<void> {
  const tabId = this.trace[0].tab.id;

  // Call open then setOptions
  // https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.sidepanel-open/script.js#L9
  await chrome.sidePanel.open({
    tabId,
  });

  await chrome.sidePanel.setOptions({
    tabId,
    path: `sidebar.html?tabId=${tabId}`,
    enabled: true,
  });
}

export async function hideSidebarPanel(this: MessengerMeta): Promise<void> {
  const tabId = this.trace[0].tab.id;

  await chrome.sidePanel.setOptions({
    tabId,
    enabled: false,
  });
}
