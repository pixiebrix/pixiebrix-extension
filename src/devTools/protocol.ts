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

import browser, { WebNavigation } from "webextension-polyfill";
import { navigationEvent } from "@/background/devtools/external";
import { resetTab } from "@/contentScript/messenger/api";
import { thisTab } from "./utils";

const TOP_LEVEL_FRAME_ID = 0;

export function updateDevTools() {
  navigationEvent.emit(browser.devtools.inspectedWindow.tabId);
}

function onNavigation(
  details:
    | WebNavigation.OnHistoryStateUpdatedDetailsType
    | WebNavigation.OnDOMContentLoadedDetailsType
): void {
  if (
    details.frameId === TOP_LEVEL_FRAME_ID &&
    details.tabId === browser.devtools.inspectedWindow.tabId
  ) {
    updateDevTools();
  }
}

export function watchNavigation(): void {
  browser.webNavigation.onHistoryStateUpdated.addListener(onNavigation);
  browser.webNavigation.onDOMContentLoaded.addListener(onNavigation);
  window.onbeforeunload = () => {
    resetTab(thisTab);
  };

  if (process.env.DEBUG)
    browser.webNavigation.onTabReplaced.addListener(
      ({ replacedTabId, tabId }) => {
        console.warn(
          `The tab ID was updated by the browser from ${replacedTabId} to ${tabId}. Did this cause any issues? https://stackoverflow.com/q/17756258/288906`
        );
      }
    );
}
