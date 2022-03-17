/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { Menus, Tabs } from "webextension-polyfill";
import { getErrorMessage, hasCancelRootCause } from "@/errors";
import reportError from "@/telemetry/reportError";
import { noop } from "lodash";
import { handleMenuAction, notify } from "@/contentScript/messenger/api";
import { ensureContentScript } from "@/background/util";
import { reportEvent } from "@/telemetry/events";
import { UUID, IExtension, ResolvedExtension } from "@/core";
import { expectContext } from "@/utils/expectContext";
import extensionPointRegistry from "@/extensionPoints/registry";
import {
  ContextMenuConfig,
  ContextMenuExtensionPoint,
} from "@/extensionPoints/contextMenu";
import { loadOptions } from "@/store/extensionsStorage";
import { resolveDefinitions } from "@/registry/internal";
import { allSettledValues } from "@/utils";

type ExtensionId = UUID;
// This is the type the browser API has for menu ids. In practice they should be strings because that's what we're
// creating via `makeMenuId`
type MenuItemId = number | string;

const extensionMenuItems = new Map<ExtensionId, MenuItemId>();
const pendingRegistration = new Set<ExtensionId>();

const MENU_PREFIX = "pixiebrix-";

// This constant must be high enough to give Chrome time to inject the content script. ensureContentScript can take
// >= 1 seconds because it also waits for the content script to be ready
const CONTEXT_SCRIPT_INSTALL_MS = 5000;

export type SelectionMenuOptions = {
  extensionId: UUID;
  title: string;
  contexts: Menus.ContextType[];
  documentUrlPatterns: string[];
};

function makeMenuId(extensionId: UUID): string {
  return `${MENU_PREFIX}${extensionId}`;
}

/**
 * FIXME: this method doesn't handle frames
 */
async function dispatchMenu(
  info: Menus.OnClickData,
  tab: Tabs.Tab
): Promise<void> {
  expectContext("background");

  const target = { frameId: info.frameId, tabId: tab.id };

  if (typeof info.menuItemId !== "string") {
    throw new TypeError(`Not a PixieBrix menu item: ${info.menuItemId}`);
  }

  reportEvent("ContextMenuClick", { extensionId: info.menuItemId });

  console.time("ensureContentScript");

  // Using the context menu gives temporary access to the page
  await pTimeout(
    ensureContentScript(target),
    CONTEXT_SCRIPT_INSTALL_MS,
    `contentScript for context menu handler not ready in ${CONTEXT_SCRIPT_INSTALL_MS}ms`
  );

  console.timeEnd("ensureContentScript");

  try {
    await handleMenuAction(target, {
      extensionId: info.menuItemId.slice(MENU_PREFIX.length) as UUID,
      args: info,
    });
    notify.success(target, "Ran content menu item action");
  } catch (error) {
    if (hasCancelRootCause(error)) {
      notify.info(target, "The action was cancelled");
    } else {
      // Report the original error here. The stack trace will point to this block anyway, but its origin will be
      // better defined. Here it's called explicitly because the messaging API does not automatically serialize errors,
      // especially deep inside other objects.
      reportError(error);

      notify.error(target, {
        message: "Error handling context menu action",
        error,
        reportError: false,
      });
    }
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
  } catch (error) {
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
  expectContext("background");

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
      } catch (error) {
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
  } catch (error) {
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

export async function preloadContextMenus(
  extensions: IExtension[]
): Promise<void> {
  expectContext("background");
  await Promise.allSettled(
    extensions.map(async (definition) => {
      const resolved = await resolveDefinitions(definition);

      const extensionPoint = await extensionPointRegistry.lookup(
        resolved.extensionPointId
      );
      if (extensionPoint instanceof ContextMenuExtensionPoint) {
        await extensionPoint.ensureMenu(
          definition as unknown as ResolvedExtension<ContextMenuConfig>
        );
      }
    })
  );
}

async function preloadAllContextMenus(): Promise<void> {
  const { extensions } = await loadOptions();
  const resolved = await allSettledValues(
    extensions.map(async (x) => resolveDefinitions(x))
  );
  await preloadContextMenus(resolved);
}

export default function initContextMenus(): void {
  void preloadAllContextMenus();
  browser.contextMenus.onClicked.addListener(menuListener);
}
