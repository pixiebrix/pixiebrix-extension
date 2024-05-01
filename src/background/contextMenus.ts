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

import pTimeout from "p-timeout";
import { type Menus, type Tabs } from "webextension-polyfill";
import { handleMenuAction, notify } from "@/contentScript/messenger/strict/api";
import { waitForContentScript } from "@/background/contentScript";
import { expectContext } from "@/utils/expectContext";
import extensionPointRegistry from "@/starterBricks/registry";
import { ContextMenuStarterBrickABC } from "@/starterBricks/contextMenu/contextMenu";
import { getModComponentState } from "@/store/extensionsStorage";
import { resolveExtensionInnerDefinitions } from "@/registry/internal";
import { type UUID } from "@/types/stringTypes";
import {
  type ModComponentBase,
  type ResolvedModComponent,
} from "@/types/modComponentTypes";
import { allSettled } from "@/utils/promiseUtils";
import { ContextError } from "@/errors/genericErrors";
import { selectEventData } from "@/telemetry/deployments";
import { type ContextMenuConfig } from "@/starterBricks/contextMenu/types";
import { MENU_PREFIX, makeMenuId } from "@/background/contextMenus/makeMenuId";

// This constant must be high enough to give Chrome time to inject the content script. waitForContentScript can take
// >= 1 seconds because it also waits for the content script to be ready
const CONTEXT_SCRIPT_INSTALL_MS = 5000;

/**
 * Dispatch a Chrome context menu event to the corresponding content script.
 * FIXME: this method doesn't handle frames
 * @see handleMenuAction
 */
async function dispatchMenu(
  info: Menus.OnClickData,
  tab: Tabs.Tab,
): Promise<void> {
  expectContext("background");

  const target = { frameId: info.frameId ?? 0, tabId: tab.id };

  if (typeof info.menuItemId !== "string") {
    throw new TypeError(`Not a PixieBrix menu item: ${info.menuItemId}`);
  }

  console.time("waitForContentScript");

  // Browser will add at document_idle. But ensure it's ready before continuing
  // TODO: Use `waitForContentScript`'s own timeout instead of pTimeout
  // TODO: Use `logPromiseDuration` instead of `console.time`, because the former uses `console.debug` internally
  await pTimeout(waitForContentScript(target), {
    milliseconds: CONTEXT_SCRIPT_INSTALL_MS,
    message: `contentScript for context menu handler not ready in ${CONTEXT_SCRIPT_INSTALL_MS}ms`,
  });

  console.timeEnd("waitForContentScript");

  try {
    await handleMenuAction(target, {
      extensionId: info.menuItemId.slice(MENU_PREFIX.length) as UUID,
      args: info,
    });
  } catch (error) {
    notify.error(target, {
      // Handle internal/messenger errors here. The real error handling occurs in the contextMenu extension point
      error: new Error("Error handling context menu action", { cause: error }),
    });
  }
}

function menuListener(info: Menus.OnClickData, tab: Tabs.Tab) {
  if (String(info.menuItemId).startsWith(MENU_PREFIX)) {
    void dispatchMenu(info, tab);
  } else {
    console.debug(`Ignoring menu item: ${info.menuItemId}`);
  }
}

/**
 * Uninstall the contextMenu UI for `extensionId` from browser context menu on all tabs.
 *
 * Safe to call on non-context menu extension ids.
 *
 * @returns true if the contextMenu was removed, or false if the contextMenu was not found.
 */
export async function uninstallContextMenu({
  extensionId,
}: {
  extensionId: UUID;
}): Promise<boolean> {
  try {
    await browser.contextMenus.remove(makeMenuId(extensionId));
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

/**
 * Add context menu items to the Chrome context menu on all tabs, in anticipation that on Page Load, the content
 * script will register a handler for the item.
 * @param extensions the ModComponent to preload.
 */
export async function preloadContextMenus(
  extensions: ModComponentBase[],
): Promise<void> {
  expectContext("background");
  const promises = extensions.map(async (definition) => {
    const resolved = await resolveExtensionInnerDefinitions(definition);

    const extensionPoint = await extensionPointRegistry.lookup(
      resolved.extensionPointId,
    );
    if (extensionPoint instanceof ContextMenuStarterBrickABC) {
      await extensionPoint.registerMenuItem(
        definition as unknown as ResolvedModComponent<ContextMenuConfig>,
        () => {
          throw new ContextError(
            "Context menu was preloaded, but no handler was registered",
            {
              context: selectEventData(resolved),
            },
          );
        },
      );
    }
  });
  await allSettled(promises, { catch: "ignore" });
}

async function preloadAllContextMenus(): Promise<void> {
  const { extensions } = await getModComponentState();
  const { fulfilled } = await allSettled(
    extensions.map(async (x) => resolveExtensionInnerDefinitions(x)),
    { catch: "ignore" },
  );
  await preloadContextMenus(fulfilled);
}

export default function initContextMenus(): void {
  void preloadAllContextMenus();
  browser.contextMenus.onClicked.addListener(menuListener);
}
