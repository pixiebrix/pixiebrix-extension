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

import {
  notifyNavigation,
  reactivate as reactivateExtensions,
} from "@/contentScript/lifecycle";

import { liftBackground } from "@/background/protocol";
import { browser } from "webextension-polyfill-ts";

function initNavigation(): void {
  browser.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    // console.debug("onHistoryStateUpdated", details);
    const { tabId } = details;
    notifyNavigation(tabId);
  });
}

export const reactivate = liftBackground(
  "REACTIVATE",
  async () => {
    await reactivateExtensions(null);
  },
  { asyncResponse: false }
);

export default initNavigation;
