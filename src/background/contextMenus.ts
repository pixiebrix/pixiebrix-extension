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
import { browser, ContextMenus, Menus, Tabs } from "webextension-polyfill-ts";
import { isBackgroundPage } from "webext-detect-page";
import { reportError } from "@/telemetry/logging";
import { handleMenuAction } from "@/contentScript/contextMenus";

type MenuItemId = number | string;

const registered: { [extensionId: string]: MenuItemId } = {};

interface SelectionMenuOptions {
  extensionId: string;
  title: string;
  contexts: ContextMenus.ContextType[];
  documentUrlPatterns: string[];
}

function menuListener(info: Menus.OnClickData, tab: Tabs.Tab) {
  if (registered[info.menuItemId] != null) {
    handleMenuAction(tab.id, info.menuItemId as string, info).catch(
      (reason) => {
        return reportError(`Error processing context menu action: ${reason}`);
      }
    );
  }
}

export const ensureContextMenu = liftBackground(
  "ENSURE_CONTEXT_MENU",
  async ({
    extensionId,
    contexts,
    title,
    documentUrlPatterns,
  }: SelectionMenuOptions) => {
    console.debug(`Registering context menu ${extensionId}`);

    const createProperties: Menus.CreateCreatePropertiesType = {
      type: "normal",
      title,
      contexts,
      documentUrlPatterns,
    };

    try {
      // https://developer.chrome.com/extensions/contextMenus#method-create
      if (registered[extensionId] != null) {
        await browser.contextMenus.update(
          registered[extensionId],
          createProperties
        );
      } else {
        registered[extensionId] = await browser.contextMenus.create({
          ...createProperties,
          id: extensionId,
        });
      }
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
