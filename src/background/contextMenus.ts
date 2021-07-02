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

import pTimeout from "p-timeout";
import { liftBackground } from "@/background/protocol";
import { browser, ContextMenus, Menus, Tabs } from "webextension-polyfill-ts";
import { isBackgroundPage } from "webext-detect-page";
import { reportError } from "@/telemetry/logging";
import { handleMenuAction } from "@/contentScript/contextMenus";
import { showNotification } from "@/contentScript/notify";
import { ensureContentScript } from "@/background/util";
import { reportEvent } from "@/telemetry/events";
import { hasCancelRootCause } from "@/errors";
import { getErrorMessage } from "@/extensionPoints/helpers";

type ExtensionId = string;
type MenuItemId = number | string;

const extensionMenuItems = new Map<ExtensionId, MenuItemId>();

const MENU_PREFIX = "pixiebrix-";
const CONTEXT_SCRIPT_INSTALL_MS = 1000;
const CONTEXT_MENU_INSTALL_MS = 1000;

interface SelectionMenuOptions {
  extensionId: string;
  title: string;
  contexts: ContextMenus.ContextType[];
  documentUrlPatterns: string[];
}

function makeMenuId(extensionId: string): string {
  return `${MENU_PREFIX}${extensionId}`;
}

async function dispatchMenu(
  info: Menus.OnClickData,
  tab: Tabs.Tab
): Promise<void> {
  // FIXME: this method doesn't handle frames properly

  const target = { frameId: info.frameId, tabId: tab.id };

  if (typeof info.menuItemId !== "string") {
    throw new TypeError(`Not a PixieBrix menu item: ${info.menuItemId}`);
  }

  // Using the context menu gives temporary access to the page
  await pTimeout(
    ensureContentScript(target),
    CONTEXT_SCRIPT_INSTALL_MS,
    `contentScript not ready in ${CONTEXT_SCRIPT_INSTALL_MS}s`
  );

  try {
    await handleMenuAction(target, {
      extensionId: info.menuItemId.slice(MENU_PREFIX.length),
      args: info,
      maxWaitMillis: CONTEXT_MENU_INSTALL_MS,
    });
    void showNotification(target, {
      message: "Ran content menu item action",
      className: "success",
    });
  } catch (error) {
    if (hasCancelRootCause(error)) {
      void showNotification(target, {
        message: "The action was cancelled",
        className: "info",
      });
    } else {
      const message = `Error processing context menu action: ${getErrorMessage(
        error
      )}`;
      reportError(new Error(message));
      void showNotification(target, { message, className: "error" });
    }
  }

  try {
    reportEvent("ContextMenuClick", { extensionId: info.menuItemId });
  } catch (error) {
    console.warn("Error reporting ContextMenuClick event", { error });
  }
}

function menuListener(info: Menus.OnClickData, tab: Tabs.Tab) {
  if (
    typeof info.menuItemId === "string" &&
    info.menuItemId.startsWith(MENU_PREFIX)
  ) {
    dispatchMenu(info, tab);
  } else {
    console.debug(`Ignoring menu item: ${info.menuItemId}`);
  }
}

export async function uninstall(extensionId: string): Promise<void> {
  try {
    await browser.contextMenus.remove(makeMenuId(extensionId));
    console.debug(`Uninstalled context menu ${extensionId}`);
  } catch (error) {
    console.warn(`Could not uninstall context menu ${extensionId}: ${error}`);
  } finally {
    extensionMenuItems.delete(extensionId);
  }
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
    if (!extensionId) {
      throw new Error("extensionId is required");
    }

    const createProperties: Menus.CreateCreatePropertiesType = {
      type: "normal",
      title,
      contexts,
      documentUrlPatterns,
    };

    try {
      // https://developer.chrome.com/extensions/contextMenus#method-create
      if (extensionMenuItems.has(extensionId)) {
        const menuId = extensionMenuItems.get(extensionId);

        try {
          await browser.contextMenus.update(menuId, createProperties);
          console.debug(`Updated context menu: ${extensionId}`, {
            menuId,
            title,
            contexts,
            documentUrlPatterns,
            extensionId,
          });
        } catch (error) {
          console.debug("Cannot update context menu", { error });
          const menuId = browser.contextMenus.create({
            ...createProperties,
            id: makeMenuId(extensionId),
          });
          extensionMenuItems.set(extensionId, menuId);
          console.debug(
            `Created new context menu (update failed): ${extensionId}`,
            {
              menuId,
              title,
              contexts,
              documentUrlPatterns,
              extensionId,
            }
          );
        }
      } else {
        const menuId = browser.contextMenus.create({
          ...createProperties,
          id: makeMenuId(extensionId),
        });
        extensionMenuItems.set(extensionId, menuId);

        console.debug(`Created new context menu: ${extensionId}`, {
          menuId,
          title,
          contexts,
          documentUrlPatterns,
          extensionId,
        });
      }
    } catch (error) {
      console.error(`Error registering context menu item`, error);
      throw error;
    }
  }
);

if (isBackgroundPage()) {
  browser.contextMenus.onClicked.addListener(menuListener);
  console.debug("Attached context menu listener");
}
