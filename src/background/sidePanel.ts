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

import { openSidePanel } from "@/mv3/sidePanelMigration";
import type { MessengerMeta } from "webext-messenger";
import { isMV3 } from "@/mv3/api";

export async function showMySidePanel(this: MessengerMeta): Promise<void> {
  await openSidePanel(this.trace[0].tab.id);
}

// TODO: Drop if this is ever implemented: https://github.com/w3c/webextensions/issues/515
export async function initSidePanel(): Promise<void> {
  if (!isMV3()) {
    return;
  }

  // TODO: Drop this once the popover URL behavior is merged into sidebar.html
  // https://github.com/pixiebrix/pixiebrix-extension/issues/7364
  chrome.tabs.onCreated.addListener(({ id: tabId }) => {
    if (tabId) {
      void chrome.sidePanel.setOptions({
        tabId,
        path: "sidebar.html?tabId=" + tabId,
      });
    }
  });

  // We need to target _all_ tabs, not just those we have access to
  const existingTabs = await chrome.tabs.query({});
  await Promise.all(
    existingTabs.map(async ({ id: tabId, url }) =>
      chrome.sidePanel.setOptions({
        tabId,
        path: "sidebar.html?tabId=" + tabId,
        enabled: true,
      }),
    ),
  );
}
