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

import { liftBackground } from "@/background/devtools/internal";

const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 150;

async function onTabClose(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const handlePossibleClosure = (closeTabId: number) => {
      if (closeTabId === tabId) {
        resolve();
        browser.tabs.onRemoved.removeListener(handlePossibleClosure);
      }
    };
    browser.tabs.onRemoved.addListener(handlePossibleClosure);
  });
}

async function _openPopup(url: string): Promise<void> {
  console.log("will open", url);

  const window = await browser.windows.create({
    url: String(url),
    focused: true,
    height: WINDOW_HEIGHT,
    width: WINDOW_WIDTH,
    top: Math.round((screen.availHeight - WINDOW_HEIGHT) / 2),
    left: Math.round((screen.availWidth - WINDOW_WIDTH) / 2),
    type: "popup",
  });

  await onTabClose(window.tabs[0].id);
}

export const openPopup = liftBackground("OPEN_POPUP", () => _openPopup);
