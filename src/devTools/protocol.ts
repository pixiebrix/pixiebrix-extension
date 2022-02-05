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

import browser from "webextension-polyfill";
import { resetTab } from "@/contentScript/messenger/api";
import { thisTab } from "./utils";
import { Target } from "@/types";
import { updateDevTools } from "./events";

const TOP_LEVEL_FRAME_ID = 0;

// The editor only cares for the top frame
function isCurrentTopFrame({ tabId, frameId }: Target) {
  return (
    frameId === TOP_LEVEL_FRAME_ID &&
    tabId === browser.devtools.inspectedWindow.tabId
  );
}

async function onNavigation(target: Target): Promise<void> {
  if (isCurrentTopFrame(target)) {
    updateDevTools();
  }
}

function onEditorClose(): void {
  resetTab(thisTab);
}

export function watchNavigation(): void {
  browser.webNavigation.onDOMContentLoaded.addListener(onNavigation);
  window.addEventListener("beforeunload", onEditorClose);

  if (process.env.DEBUG)
    browser.webNavigation.onTabReplaced.addListener(
      ({ replacedTabId, tabId }) => {
        console.warn(
          `The tab ID was updated by the browser from ${replacedTabId} to ${tabId}. Did this cause any issues? https://stackoverflow.com/q/17756258/288906`
        );
      }
    );
}
