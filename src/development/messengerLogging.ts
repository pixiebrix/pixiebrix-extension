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

import { toggleLogging } from "webext-messenger/logging.js";
import { StorageItem } from "webext-storage";

export const messengerLogging = new StorageItem("MESSENGER_LOGGING", {
  defaultValue: false,
});

export async function initMessengerLogging(): Promise<void> {
  if (await messengerLogging.get()) {
    toggleLogging(true);
  }

  messengerLogging.onChanged((newValue) => {
    toggleLogging(newValue);
  });
}
