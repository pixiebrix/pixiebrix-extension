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
import { injectContentScript, waitReady } from "@/background/util";

type MenuItemId = number | string;

const extensionMenuItems = new Map<string, MenuItemId>();

const CONTEXT_SCRIPT_INSTALL_MS = 1000;
const CONTEXT_MENU_INSTALL_MS = 500;

interface SelectionMenuOptions {
  extensionId: string;
  title: string;
  contexts: ContextMenus.ContextType[];
  documentUrlPatterns: string[];
}

async function runMenu(info: Menus.OnClickData, tab: Tabs.Tab): Promise<void> {
  // FIXME: this method doesn't handle frames properly

  // Using the context menu gives temporary access to the page
  await injectContentScript(tab.id);
  await waitReady(tab.id, { maxWaitMillis: CONTEXT_SCRIPT_INSTALL_MS });

  if (typeof info.menuItemId !== "string") {
    throw new Error(
      `Menu item ${info.menuItemId} is not a PixieBrix menu item`
    );
  }

  try {
    await handleMenuAction(tab.id, {
      extensionId: info.menuItemId,
      args: info,
      maxWaitMillis: CONTEXT_MENU_INSTALL_MS,
    });
    showNotification(tab.id, {
      message: "Ran content menu item action",
      className: "success",
    });
  } catch (err) {
    const message = `Error processing context menu action: ${err}`;
    reportError(message);
    showNotification(tab.id, { message, className: "error" }).catch(
      (reason) => {
        reportError(reason);
      }
    );
  }
}

function menuListener(info: Menus.OnClickData, tab: Tabs.Tab) {
  if (
    typeof info.menuItemId === "string" &&
    extensionMenuItems.has(info.menuItemId)
  ) {
    runMenu(info, tab);
  }
}

export async function uninstall(extensionId: string): Promise<void> {
  try {
    await browser.contextMenus.remove(extensionId);
    console.debug(`Uninstalled context menu ${extensionId}`);
  } catch (reason) {
    console.debug(`Could not uninstall context menu ${extensionId}: ${reason}`);
  }
  extensionMenuItems.delete(extensionId);
}

export const uninstallContextMenu = liftBackground(
  "UNINSTALL_CONTEXT_MENU",
  async ({ extensionId }: { extensionId: string }) => {
    await uninstall(extensionId);
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
