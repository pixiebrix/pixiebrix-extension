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

import { isDevToolsPage, isOptionsPage } from "webext-detect-page";
import { useAsyncState } from "@/hooks/common";

/**
 * Get the current origin for where code is running. Used to set the origin on the
 * Google Sheets file picker.
 * From Google:
 *    "The origin should be set to the window.location.protocol + '//' + window.location.host
 *    of the top-most page, if your application is running in an iframe."
 *
 * @returns The current origin, or empty string if the origin is being fetched
 */
function useCurrentOrigin(): string {
  const [origin] = useAsyncState(async () => {
    // Checks location.pathname against the 'options_ui' value in manifest.json
    if (isOptionsPage()) {
      return browser.runtime.getURL("");
    }

    if (
      // Checks location.pathname against the 'devtools_page' value in manifest.json
      // This won't match for dev tools panels created by the devtool
      // page (i.e. the Page Editor)
      isDevToolsPage() ||
      // Check for the page editor pagePath in the location pathname
      location.pathname === "/pageEditor.html"
    ) {
      return "devtools://devtools";
    }

    // Default to using the Chrome tabs API to get the active tab url
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    return tabs[0].url;
  }, []);

  return origin;
}

export default useCurrentOrigin;
