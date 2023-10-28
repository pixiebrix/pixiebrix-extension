/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import {
  type ManualStorageKey,
  readStorage,
  setStorage,
} from "@/utils/storageUtils";
import { toggleLogging } from "webext-messenger/logging.js";

const MESSENGER_LOGGING_KEY = "MESSENGER_LOGGING" as ManualStorageKey;

export async function getMessengerLogging(): Promise<boolean> {
  return readStorage(MESSENGER_LOGGING_KEY, false);
}

export async function setMessengerLogging(config: boolean): Promise<void> {
  await setStorage(MESSENGER_LOGGING_KEY, config);
}

export async function initMessengerLogging(): Promise<void> {
  if (await getMessengerLogging()) {
    toggleLogging(true);
  }

  browser.storage.onChanged.addListener(async (changes) => {
    // eslint-disable-next-line security/detect-object-injection -- Constant key
    const change = changes[MESSENGER_LOGGING_KEY];
    if (change) {
      toggleLogging(change.newValue as boolean);
    }
  });
}
