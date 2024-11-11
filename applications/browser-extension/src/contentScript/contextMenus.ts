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

import { type Menus } from "webextension-polyfill";
import { type UUID } from "@/types/stringTypes";
import notify from "@/utils/notify";
import { getReloadOnNextNavigate } from "@/contentScript/ready";

type MenuHandler = (args: Menus.OnClickData) => Promise<void>;

// eslint-disable-next-line local-rules/persistBackgroundData -- Functions
const handlers = new Map<UUID, MenuHandler>();

/**
 * Register a context menu handler for the given mod component. Overwrites any existing handler.
 */
export function registerHandler(
  modComponentId: UUID,
  handler: MenuHandler,
): void {
  handlers.set(modComponentId, handler);
}

/**
 * Handle a context menu action. Called from the background page.
 * @param modComponentId the mod component id
 * @param args the args from the Chrome context menu action event
 * @see dispatchMenu
 */
export async function handleMenuAction({
  modComponentId,
  args,
}: {
  modComponentId: UUID;
  args: Menus.OnClickData;
}): Promise<void> {
  const handler = handlers.get(modComponentId);
  if (handler) {
    await handler(args);
    return;
  }

  // If the handler fails, there's 3 potential scenarios:
  // 1. The user is editing a new menu item in the Page Editor, so only that tab has the handler.
  // In the future, we could consider checking to see if the Page Editor is open in any tab.

  // 2. The context menu was activated (e.g., mod update) but the content script hasn't reloaded yet
  if (getReloadOnNextNavigate()) {
    // We don't know which mod was updated, or if the mod containing intended context menu was updated. However,
    // reloading the page will generally be the best remedy
    notify.warning("A mod was updated. Reload the page to use this action.");
    return;
  }

  // 3. An actual error occurred
  console.error("No context menu found for mod component: %s", modComponentId, {
    modComponentId,
    handlers: [...handlers.keys()],
  });

  throw new Error(
    "No context menu handler found. Please try reloading the page.",
  );
}
