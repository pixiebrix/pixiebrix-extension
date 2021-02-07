/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import { isBackgroundPage } from "webext-detect-page";
import { browser } from "webextension-polyfill-ts";
import * as contentScriptProtocol from "@/contentScript/devTools";

export async function testTabPermissions(tabId: number): Promise<boolean> {
  if (!isBackgroundPage()) {
    throw new Error(
      "hasTabPermissions can only be called from the background page"
    );
  }

  try {
    // can't use browser.permissions.contains for permissions because it doesn't seem to work with activeTab
    await browser.tabs.executeScript(tabId, {
      allFrames: false,
      frameId: 0,
      code: "true;",
      runAt: "document_start",
    });
    return true;
  } catch (reason) {
    if ((reason.message as string)?.includes("Cannot access contents")) {
      // no permissions
    } else {
      console.warn("testTabPermissions failed", { reason });
    }
  }
  return false;
}

/**
 * Inject a contentScript into a page if the contentScript is not already available on the page
 * @param tabId the tab to inject the contentScript into
 * @param file the contentScript file
 * @return true if the content script was injected
 */
export async function injectContentScript(
  tabId: number,
  file = "contentScript.js"
): Promise<boolean> {
  if (!isBackgroundPage()) {
    throw new Error(
      "injectContentScript can only be called from the background page"
    );
  }

  const { installed } = await contentScriptProtocol.isInstalled(tabId);

  if (!installed) {
    console.debug(`Injecting devtools contentScript for tab ${tabId}: ${file}`);

    // inject in the top-level frame
    await browser.tabs.executeScript(tabId, {
      frameId: 0,
      allFrames: false,
      file,
      runAt: "document_end",
    });

    return true;
  } else {
    console.debug(`contentScript already installed on tab ${tabId}`);
    return false;
  }
}
