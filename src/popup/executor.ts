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

import { Message } from "@/core";
import { HandlerMap, MessageHandler } from "@/messaging/protocol";

const popupPingMessage: Message = { type: "POPUP_INIT" } as const;
const _popupPing: MessageHandler<typeof popupPingMessage.type> = async () => {
  // No return, it just resolves
};
export const popupPing = async (): Promise<void> => {
  await browser.runtime.sendMessage(popupPingMessage);
};

function getHandlers(): HandlerMap {
  const handlers = new HandlerMap();
  handlers.set(popupPingMessage.type, _popupPing);
  return handlers;
}

export default function listen() {
  browser.runtime.onMessage.addListener(getHandlers().asListener());
}
