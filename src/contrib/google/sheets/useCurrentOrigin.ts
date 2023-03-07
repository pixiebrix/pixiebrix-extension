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
import { useEffect } from "react";
import notify from "@/utils/notify";

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
  const [origin, loading, error] = useAsyncState(async () => {
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
    //
    // NOTE: Technically, we might want to instead ping the background page,
    // and have it report back what the URL is. This is probably fine for now,
    // since the tab with the sidebar will be active when this code is run
    // in this PR. But, to be correct in all cases, we don't want to rely
    // on the tab/page this is running on being active.
    //
    // NOTE2: Make sure to use browser.tabs instead of chrome.tabs, in order to
    // use the MV3 promise-based syntax as opposed to the callback version.
    const tabs = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    const url = new URL(tabs[0].url);
    // See google.picker:
    // The origin should be set to the window.location.protocol + '//' +
    // window.location.host of the top-most page, if your application is
    // running in an iframe.
    return url.protocol + "//" + url.host;
  }, []);

  useEffect(() => {
    if (!loading && error) {
      notify.error({
        message: "Error occurred loading the current tab URL",
        error,
      });
    }
  }, [error, loading, origin]);

  return origin;
}

export default useCurrentOrigin;
