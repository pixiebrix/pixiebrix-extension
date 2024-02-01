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

import { openSidePanel, getSidebarPath } from "@/utils/sidePanelUtils";
import type { MessengerMeta } from "webext-messenger";
import { isMV3 } from "@/mv3/api";

export async function showMySidePanel(this: MessengerMeta): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- There's always at least one
  await openSidePanel(this.trace[0]!.tab.id!);
}

// TODO: Drop if this is ever implemented: https://github.com/w3c/webextensions/issues/515
export async function initSidePanel(): Promise<void> {
  if (!isMV3()) {
    return;
  }

  chrome.tabs.onCreated.addListener(({ id: tabId }) => {
    if (tabId) {
      void chrome.sidePanel.setOptions({
        tabId,
        path: getSidebarPath(tabId),
      });
    }
  });

  // We need to target _all_ tabs, not just those we have access to
  const existingTabs = await chrome.tabs.query({});
  await Promise.all(
    existingTabs.map(
      async ({ id: tabId, url }) =>
        tabId &&
        chrome.sidePanel.setOptions({
          tabId,
          path: getSidebarPath(tabId),
          enabled: true,
        }),
    ),
  );
}
