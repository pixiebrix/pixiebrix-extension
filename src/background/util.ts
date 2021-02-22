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
import { sleep } from "@/utils";

export type Target = {
  tabId: number;
  frameId: number;
};

export async function testTabPermissions(target: Target): Promise<boolean> {
  if (!isBackgroundPage()) {
    throw new Error(
      "hasTabPermissions can only be called from the background page"
    );
  }

  try {
    // can't use browser.permissions.contains for permissions because it doesn't seem to work with activeTab
    await browser.tabs.executeScript(target.tabId, {
      allFrames: false,
      frameId: target.frameId ?? 0,
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

export async function waitReady(
  target: Target,
  { maxWaitMillis }: { maxWaitMillis: number }
): Promise<void> {
  const start = Date.now();
  do {
    const { ready } = await contentScriptProtocol.isInstalled(target);
    if (ready) {
      return;
    }
    await sleep(150);
  } while (Date.now() - start < maxWaitMillis);
  throw new Error(`contentScript not ready in ${maxWaitMillis}ms`);
}

/**
 * Inject a contentScript into a page if the contentScript is not already available on the page
 * @param target the tab frame to inject the contentScript into
 * @param file the contentScript file
 * @return true if the content script was injected
 */
export async function injectContentScript(
  target: Target,
  file = "contentScript.js"
): Promise<boolean> {
  if (!isBackgroundPage()) {
    throw new Error(
      "injectContentScript can only be called from the background page"
    );
  }

  const { installed } = await contentScriptProtocol.isInstalled(target);

  if (!installed) {
    console.debug(
      `Injecting devtools contentScript for tab ${target.tabId}, frame ${
        target.frameId ?? 0
      }: ${file}`
    );

    // inject in the top-level frame
    await browser.tabs.executeScript(target.tabId, {
      frameId: target.frameId ?? 0,
      allFrames: false,
      file,
      runAt: "document_end",
    });

    return true;
  } else {
    console.debug(
      `contentScript already installed on tab ${target.tabId}, frame ${
        target.frameId ?? 0
      }`
    );
    return false;
  }
}
