/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { isOptionsPage } from "webext-detect";
import { useEffect } from "react";
import notify from "@/utils/notify";
import useAsyncState from "@/hooks/useAsyncState";
import { isPageEditorTopFrame } from "@/utils/expectContext";
import { type Nullishable } from "@/utils/nullishUtils";

/**
 * Get the current origin for where code is running. Used to set the origin on the
 * Google Sheets file picker.
 * From Google:
 *    "The origin should be set to the window.location.protocol + '//' + window.location.host
 *    of the top-most page, if your application is running in an iframe."
 *
 * @returns The current origin, or undefined on initial load/error.
 */
function useCurrentOrigin(): Nullishable<string> {
  const {
    data: origin,
    isFetching,
    error,
  } = useAsyncState<string | null>(async () => {
    // Checks location.pathname against the 'options_ui' value in manifest.json
    if (isOptionsPage()) {
      return browser.runtime.getURL("");
    }

    if (isPageEditorTopFrame()) {
      return "devtools://devtools";
    }

    // Default to using the Chrome tabs API to get the active tab url
    //
    // NOTE: Technically, we might want to instead ping the background page,
    // and have it report back what the URL is. This is probably fine for now,
    // since the tab with the sidebar will be active when this code is run
    // in this PR. But, to be correct in all cases, we don't want to rely
    // on the tab/page this is running on being active.
    const tabs = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    const tab = tabs[0];
    if (tab?.url == null) {
      return null;
    }

    return new URL(tab.url).origin;
  }, []);

  useEffect(() => {
    if (error && !isFetching) {
      notify.error({
        message: "Error occurred loading the current tab URL",
        error,
      });
    }
  }, [error, isFetching]);

  return origin;
}

export default useCurrentOrigin;
