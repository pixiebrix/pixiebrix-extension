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

import { DEV_WATCH_READER } from "@/messaging/constants";
import { clearObject } from "@/utils";

function initDevToolsProtocol(readers) {
  chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener(({ type, payload }) => {
      switch (type) {
        case DEV_WATCH_READER: {
          const { id } = payload;
          // for now only watch a single reader
          clearObject(readers);
          _watchedReaders[id] = port;
          console.debug(`Installed reader ${id}`);
          break;
        }
        default: {
          break;
        }
      }
    });

    port.onDisconnect.addListener(() => {
      clearObject(readers);
    });
  });
}

export default initDevToolsProtocol;
