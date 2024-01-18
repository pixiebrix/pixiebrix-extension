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

/** @file This file defines the internal API for the sidePanel, only meant to be run in the sidePanel itself */

import { expectContext } from "@/utils/expectContext";
import {
  PING_SIDE_PANEL,
  getAssociatedTarget,
} from "@/sidebar/sidePanel/messenger/api";
import { sidebarWasLoaded } from "@/contentScript/messenger/api";
import { isObject } from "@/utils/objectUtils";

expectContext("sidebar");

// Do not use the messenger because it doesn't support retry-less messaging
// TODO: Drop after https://github.com/pixiebrix/webext-messenger/issues/59
function respondToPings() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      isObject(message) &&
      message.type === PING_SIDE_PANEL &&
      sender.tab?.id === getAssociatedTarget().tabId
    ) {
      sendResponse(true);
    }
  });
}

export function initSidePanel() {
  respondToPings();
  sidebarWasLoaded(getAssociatedTarget());
}
