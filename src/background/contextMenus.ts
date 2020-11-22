/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { liftBackground } from "@/background/protocol";
import { browser, Menus, Tabs } from "webextension-polyfill-ts";
import { isBackgroundPage } from "webext-detect-page";
import { reportError } from "@/telemetry/logging";
import { handleMenuAction } from "@/contentScript/contextMenus";

const registered: { [extensionId: string]: boolean } = {};

interface SelectionMenuOptions {
  extensionId: string;
  title: string;
  documentUrlPatterns: string[];
}

function menuListener(info: Menus.OnClickData, tab: Tabs.Tab) {
  if (registered[info.menuItemId]) {
    handleMenuAction(tab.id, info.menuItemId as string, {
      selectionText: info.selectionText,
    }).catch((reason) => {
      return reportError(`Error processing context menu action: ${reason}`);
    });
  }
}

export const ensureContextMenu = liftBackground(
  "ENSURE_CONTEXT_MENU",
  async ({ extensionId, title, documentUrlPatterns }: SelectionMenuOptions) => {
    console.debug(`Registering context menu ${extensionId}`);
    try {
      await browser.contextMenus.create({
        type: "normal",
        title,
        contexts: ["selection"],
        id: extensionId,
        documentUrlPatterns,
      });
      registered[extensionId] = true;
    } catch (reason) {
      console.error(`Error registering context menu item: ${reason}`);
      throw reason;
    }
  }
);

if (isBackgroundPage()) {
  browser.contextMenus.onClicked.addListener(menuListener);
  console.debug("Attached context menu listener");
}
