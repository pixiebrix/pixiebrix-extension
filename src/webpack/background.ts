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

// Adapted from: https://github.com/crimx/webpack-target-webextension/blob/master/lib/background.js
import { WEBPACK_INJECT_FILE } from "./protocol";
import MessageSender = chrome.runtime.MessageSender;

chrome.runtime.onMessage.addListener(function (
  { type, payload },
  sender: MessageSender,
  sendResponse
) {
  if (type === WEBPACK_INJECT_FILE) {
    const { file } = payload;
    const details = {
      // Should this be sender.tab.frameId?: https://github.com/crimx/webpack-target-webextension/blob/master/lib/background.js#L9
      frameId: sender.frameId,
      file,
    };
    chrome.tabs.executeScript(sender.tab.id, details, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error loading chunk ${file}`, chrome.runtime.lastError);
        sendResponse({
          type: WEBPACK_INJECT_FILE,
          error: true,
          payload: chrome.runtime.lastError,
        });
      }
      console.debug(`Loaded chunk ${file}`);
      sendResponse({ type: WEBPACK_INJECT_FILE, payload: { file } });
    });
    return true;
  }
  return false;
});
