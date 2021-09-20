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

import pTimeout from "p-timeout";
import { browser, Menus, Tabs } from "webextension-polyfill-ts";
import { isBackgroundPage } from "webext-detect-page";
import { reportError } from "@/telemetry/logging";
import { noop } from "lodash";
import { handleMenuAction } from "@/contentScript/messenger/api";
import { showNotification } from "@/contentScript/notify";
import { ensureContentScript } from "@/background/util";
import { reportEvent } from "@/telemetry/events";
import { getErrorMessage, hasCancelRootCause } from "@/errors";
import { UUID } from "@/core";

type ExtensionId = UUID;
// This is the type the browser API has for menu ids. In practice they should be strings because that's what we're
// creating via `makeMenuId`
type MenuItemId = number | string;

const extensionMenuItems = new Map<ExtensionId, MenuItemId>();
const pendingRegistration = new Set<ExtensionId>();

const MENU_PREFIX = "pixiebrix-";
const CONTEXT_SCRIPT_INSTALL_MS = 1000;
const CONTEXT_MENU_INSTALL_MS = 1000;

export type SelectionMenuOptions = {
  extensionId: UUID;
  title: string;
  contexts: Menus.ContextType[];
  documentUrlPatterns: string[];
};

function makeMenuId(extensionId: UUID): string {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.warn("Error reporting ContextMenuClick event", { error });
  }
}

function menuListener(info: Menus.OnClickData, tab: Tabs.Tab) {
  if (
    typeof info.menuItemId === "string" &&
    info.menuItemId.startsWith(MENU_PREFIX)
  ) {
    void dispatchMenu(info, tab);
  } else {
    console.debug(`Ignoring menu item: ${info.menuItemId}`);
  }
}

/**
 * Uninstall contextMenu for `extensionId`. Returns true if the contextMenu was removed, or false if the contextMenu was
 * not found.
 */
export async function uninstallContextMenu({
  extensionId,
}: {
  extensionId: UUID;
}): Promise<boolean> {
  try {
    const menuItemId = extensionMenuItems.get(extensionId);

    if (menuItemId) {
      extensionMenuItems.delete(extensionId);
      await browser.contextMenus.remove(menuItemId);
    } else {
      // Our bookkeeping in `extensionMenuItems` might be off. Try removing the expected menuId just in case.
      await browser.contextMenus.remove(makeMenuId(extensionId));
    }

    console.debug(`Uninstalled context menu ${extensionId}`);
    return true;
  } catch (error: unknown) {
    // Will throw if extensionId doesn't refer to a context menu. The callers don't have an easy way to check the type
    // without having to resolve the extensionPointId. So instead we'll just expect some of the calls to fail.
    console.debug("Could not uninstall context menu %s", extensionId, {
      error,
    });
    return false;
  }
}

export async function ensureContextMenu({
  extensionId,
  contexts,
  title,
  documentUrlPatterns,
}: SelectionMenuOptions) {
  if (!extensionId) {
    throw new Error("extensionId is required");
  }

  // Handle the thundering herd of re-registrations when a contentScript.reactivate is broadcast
  if (pendingRegistration.has(extensionId)) {
    console.debug("contextMenu registration pending for %s", extensionId);

    // Is it OK to return immediately? Or do we need to track the common promise that all callers should see?
    return;
  }

  pendingRegistration.add(extensionId);

  const updateProperties: Menus.UpdateUpdatePropertiesType = {
    type: "normal",
    title,
    contexts,
    documentUrlPatterns,
  };

  const expectedMenuId = makeMenuId(extensionId);

  try {
    let menuId = extensionMenuItems.get(extensionId);

    if (menuId) {
      try {
        await browser.contextMenus.update(menuId, updateProperties);
        return;
      } catch (error: unknown) {
        console.debug("Cannot update context menu", { error });
      }
    } else {
      // Just to be safe if our `extensionMenuItems` bookkeeping is off, remove any stale menu item
      await browser.contextMenus.remove(expectedMenuId).catch(noop);
    }

    // The update failed, or this is a new context menu
    extensionMenuItems.delete(extensionId);

    // The types of browser.contextMenus.create are wacky. I verified on Chrome that the method does take a callback
    // even when using the browser polyfill
    let createdMenuId: string | number;
    menuId = await new Promise((resolve, reject) => {
      // `browser.contextMenus.create` returns immediately with the assigned menu id
      createdMenuId = browser.contextMenus.create(
        {
          ...updateProperties,
          id: makeMenuId(extensionId),
        },
        () => {
          if (browser.runtime.lastError) {
            reject(new Error(browser.runtime.lastError.message));
          }

          resolve(createdMenuId);
        }
      );
    });

    extensionMenuItems.set(extensionId, menuId);
  } catch (error: unknown) {
    if (
      getErrorMessage(error).includes("Cannot create item with duplicate id")
    ) {
      // Likely caused by a concurrent update. In practice, our `pendingRegistration` set and `extensionMenuItems`
      // should prevent this from happening
      console.debug("Error registering context menu item", { error });
      return;
    }

    console.error("Error registering context menu item", { error });
    throw error;
  } finally {
    pendingRegistration.delete(extensionId);
  }
}

if (isBackgroundPage()) {
  browser.contextMenus.onClicked.addListener(menuListener);
  console.debug("Attached context menu listener");
}
