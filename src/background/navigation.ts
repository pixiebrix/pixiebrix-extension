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

import * as contentScript from "@/contentScript/lifecycle";
import { liftBackground } from "@/background/protocol";
import { partition } from "lodash";
import { browser, WebNavigation } from "webextension-polyfill-ts";
import { reportError } from "@/telemetry/logging";

type NavigationHandler = (
  details: WebNavigation.OnHistoryStateUpdatedDetailsType
) => void;

interface NavigationListener {
  tabId: number;
  handler: NavigationHandler;
}

let _navigationListeners: NavigationListener[] = [];

function notifyListeners(
  details: WebNavigation.OnHistoryStateUpdatedDetailsType &
    WebNavigation.OnDOMContentLoadedDetailsType
) {
  // Currently only supporting notifying top-level navigation
  if (details.frameId === 0) {
    const [handlers, other] = partition(
      _navigationListeners,
      (x) => x.tabId === details.tabId
    );
    _navigationListeners = other;

    console.debug(
      `Notify ${handlers.length} (of ${
        other.length + handlers.length
      }) handlers for tab ${details.tabId}`,
      details
    );

    for (const handler of handlers) {
      try {
        handler.handler(details);
      } catch (err) {
        reportError(err);
      }
    }
  }
}

export function addNavigationListener(
  tabId: number,
  handler: NavigationHandler
): void {
  _navigationListeners.push({ tabId, handler });
}

function initNavigation(): void {
  // updates from the history API
  browser.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    console.debug(
      `onHistoryStateUpdated (tab=${details.tabId}, frame=${details.frameId})`,
      details
    );
    contentScript.notifyNavigation(details.tabId);
    notifyListeners(details);
  });

  // All updates, e.g., typing a different URL bar into the update.
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation
  browser.webNavigation.onDOMContentLoaded.addListener(function (details) {
    notifyListeners(details);
  });
}

export const reactivate = liftBackground(
  "REACTIVATE",
  async () => {
    await contentScript.reactivate(null);
  },
  { asyncResponse: false }
);

export default initNavigation;
