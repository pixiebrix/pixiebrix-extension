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

import { liftContentScript } from "@/contentScript/backgroundProtocol";
import { Menus } from "webextension-polyfill-ts";

type Handler = (args: Menus.OnClickData) => Promise<void>;

const handlers = new Map<string, Handler>();

export function registerHandler(extensionId: string, handler: Handler): void {
  if (handlers.has(extensionId)) {
    console.warn(`Handler already installed for extension: ${extensionId}`);
  }
  handlers.set(extensionId, handler);
}

export const handleMenuAction = liftContentScript(
  "HANDLE_MENU_ACTION",
  async (extensionId: string, args: Menus.OnClickData) => {
    const handler = handlers.get(extensionId);
    if (handler == null) {
      throw new Error(
        `No context menu handler register for extension: ${extensionId}`
      );
    }
    await handler(args);
  }
);
