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

import { Menus } from "webextension-polyfill";
import { UUID } from "@/core";

type MenuHandler = (args: Menus.OnClickData) => Promise<void>;

const handlers = new Map<UUID, MenuHandler>();

export function registerHandler(extensionId: UUID, handler: MenuHandler): void {
  handlers.set(extensionId, handler);
}

export async function handleMenuAction({
  extensionId,
  args,
}: {
  extensionId: UUID;
  args: Menus.OnClickData;
}): Promise<void> {
  const handler = handlers.get(extensionId);
  if (handler) {
    await handler(args);
    return;
  }

  console.error("No context menu found for extension: %s", extensionId, {
    extensionId,
    handlers: [...handlers.keys()],
  });

  throw new Error("No context menu handler found for extension");
}
