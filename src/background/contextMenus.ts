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
import { showNotification } from "@/contentScript/notify";

type MenuItemId = number | string;

const extensionMenuItems = new Map<string, MenuItemId>();

interface SelectionMenuOptions {
  extensionId: string;
  title: string;
  contexts: ContextMenus.ContextType[];
  documentUrlPatterns: string[];
}

function menuListener(info: Menus.OnClickData, tab: Tabs.Tab) {
  if (
    typeof info.menuItemId === "string" &&
    extensionMenuItems.has(info.menuItemId)
  ) {
    handleMenuAction(tab.id, info.menuItemId, info)
      .then(() => {
        showNotification(tab.id, {
          message: "Ran content menu item action",
          className: "success",
        });
      })
      .catch((reason) => {
        const message = `Error processing context menu action: ${reason}`;
        reportError(message);
        showNotification(tab.id, { message, className: "error" }).catch(
          (reason) => {
            reportError(reason);
          }
        );
      });
  }
}

export const uninstallContextMenu = liftBackground(
  "UNINSTALL_CONTEXT_MENU",
  async ({ extensionId }: { extensionId: string }) => {
    try {
      await browser.contextMenus.remove(extensionId);
      console.debug(`Uninstalled context menu ${extensionId}`);
    } catch (reason) {
      console.debug(
        `Could not uninstall context menu ${extensionId}: ${reason}`
      );
    }
    extensionMenuItems.delete(extensionId);
  }
);

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
      if (extensionMenuItems.has(extensionId)) {
        await browser.contextMenus.update(
          extensionMenuItems.get(extensionId),
          createProperties
        );
      } else {
        const menuId = await browser.contextMenus.create({
          ...createProperties,
          id: extensionId,
        });
        extensionMenuItems.set(extensionId, menuId);
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
