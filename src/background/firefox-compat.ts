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

import { isFirefox } from "@/helpers";
import { browser } from "webextension-polyfill-ts";
import { expectBackgroundPage } from "@/utils/expectContext";

const FIREFOX_OPTIONS_MENU_ID = "PIXIEBRIX_FIREFOX_OPTIONS";

function onContextMenuClick({ menuItemId }: browser.contextMenus.OnClickData) {
  console.log("YO");
  if (menuItemId === FIREFOX_OPTIONS_MENU_ID) {
    void browser.runtime.openOptionsPage();
  }
}

export default async function initFirefoxCompat(): Promise<void> {
  expectBackgroundPage();
  if (!isFirefox) {
    return;
  }

  await browser.contextMenus.create({
    id: FIREFOX_OPTIONS_MENU_ID,
    title: "Options",
    contexts: ["browser_action"],
  });

  browser.contextMenus.onClicked.addListener(onContextMenuClick);
}
