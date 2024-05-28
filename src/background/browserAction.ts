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

import { browserAction } from "@/mv3/api";
import { openSidePanel, getSidebarTarget } from "@/utils/sidePanelUtils";
import { messenger } from "webext-messenger";

export default async function initBrowserAction(): Promise<void> {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

  // Disable by default, so that it can be enabled on a per-tab basis.
  // Without this, the sidePanel remains open as the user changes tabs
  void chrome.sidePanel.setOptions({
    enabled: false,
  });

  browserAction.onClicked.addListener(async (tab) => {
    /*
    This handler relies on a race condition:

    - If the sidebar was open:
      - openSidePanel will do nothing
      - SIDEBAR_CLOSE will reach the sidebar and close it
    - Otherwise:
      - openSidePanel will open it
      - SIDEBAR_CLOSE will fail because the message won't reach the sidebar in time

    More info in:
    - https://github.com/pixiebrix/pixiebrix-extension/pull/7429
    - https://github.com/w3c/webextensions/issues/521
    */
    if (tab.id) {
      await openSidePanel(tab.id);
      await messenger(
        "SIDEBAR_CLOSE",
        { isNotification: true, retry: false },
        getSidebarTarget(tab.id),
      );
    }
  });
}
