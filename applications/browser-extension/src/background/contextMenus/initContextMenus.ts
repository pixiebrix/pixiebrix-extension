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
import { handleMenuAction, notify } from "../../contentScript/messenger/api";
import { waitForContentScript } from "../contentScript";
import { expectContext } from "../../utils/expectContext";
import { getModComponentState } from "../../store/modComponents/modComponentStorage";
import { hydrateModComponentInnerDefinitions } from "../../registry/hydrateInnerDefinitions";
import { type UUID } from "../../types/stringTypes";
import { allSettled } from "../../utils/promiseUtils";
import { MENU_PREFIX } from "./makeMenuId";
import { preloadContextMenus } from "./preloadContextMenus";
import { assertNotNullish } from "../../utils/nullishUtils";

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

  assertNotNullish(
    tab.id,
    "tabId required to dispatch a Chrome context menu event",
  );

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
      modComponentId: info.menuItemId.slice(MENU_PREFIX.length) as UUID,
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

async function preloadAllContextMenus(): Promise<void> {
  const { activatedModComponents } = await getModComponentState();
  const { fulfilled } = await allSettled(
    activatedModComponents.map(async (x) =>
      hydrateModComponentInnerDefinitions(x),
    ),
    { catch: "ignore" },
  );
  await preloadContextMenus(fulfilled);
}

export default function initContextMenus(): void {
  void preloadAllContextMenus();
  browser.contextMenus.onClicked.addListener(menuListener);
}
